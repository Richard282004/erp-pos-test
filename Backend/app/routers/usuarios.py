import time
import uuid
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from datetime import timedelta

from app.auth import (
    create_access_token,
    crear_token_sesion,
    get_current_user,
    oauth2_scheme,
    renovar_token_sesion,
)
from app import borrado
from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

# --- Rate limiting simple en memoria para el login --------------------------
# Por IP y por usuario, con la misma ventana. Solo por IP no alcanza acá:
# Render (como varios hosts con proxy) no siempre entrega la IP real del
# cliente en X-Forwarded-For -hay un reporte abierto en su propio foro de
# feedback sobre esto-, así que confiar ciegamente en esa cabecera puede
# terminar agrupando a todo el tráfico bajo una sola IP. Si eso pasa, un
# cajero que se equivoca de clave no debería poder trabar el login de los
# demás: por eso también se cuenta por username, que no depende de la red.
_INTENTOS: dict[str, list[float]] = {}
_LOGIN_MAX = 10          # intentos
_LOGIN_VENTANA = 300     # segundos (5 min)


def _chequear_rate_limit(clave: str) -> None:
    ahora = time.monotonic()
    intentos = [t for t in _INTENTOS.get(clave, []) if ahora - t < _LOGIN_VENTANA]
    if len(intentos) >= _LOGIN_MAX:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos de inicio de sesión. Esperá unos minutos.",
        )
    intentos.append(ahora)
    _INTENTOS[clave] = intentos
    if len(_INTENTOS) > 5000:  # evitar crecimiento indefinido
        _INTENTOS.clear()


# --- Modelos -------------------------------------------------------------- #

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=60)
    password: str = Field(..., min_length=1, max_length=200)


class AutorizacionRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=60)
    password: str = Field(..., min_length=1, max_length=200)
    # Porcentaje de descuento efectivo que se está pidiendo autorizar. El token
    # queda atado a este techo: no sirve para un descuento mayor después.
    descuento_pct: float = Field(0, ge=0, le=100)


class AutorizacionResponse(BaseModel):
    token: str
    autorizado_por: str


# Sello que va dentro del token de autorización, para que no se pueda usar
# un token de sesión normal (o de otro propósito) en su lugar.
PROPOSITO_AUTORIZACION_DESCUENTO = "descuento_pos"
AUTORIZACION_EXPIRA_MIN = 3


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=60)
    password: str = Field(..., min_length=6, max_length=200)
    nombre: str = Field(..., min_length=1, max_length=80)
    apellido: str = Field(..., min_length=1, max_length=80)
    id_rol: int
    id_sucursal: int


class UsuarioOut(BaseModel):
    id_usuario: int
    username: str
    nombre: str
    apellido: str
    id_rol: int
    id_sucursal: int
    activo: bool


class UsuarioUpdate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    apellido: str = Field(..., min_length=1, max_length=80)
    id_rol: int
    id_sucursal: int
    password: Optional[str] = Field(None, min_length=6, max_length=200)


_ROLES_VALIDOS = (Rol.ADMIN, Rol.SUPERVISOR, Rol.CAJERO)


def _validar(conn, id_rol: int, id_sucursal: int) -> None:
    if id_rol not in _ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail="id_rol inválido")
    suc = conn.execute(
        text("SELECT 1 FROM sucursales WHERE id_sucursal = :s"), {"s": id_sucursal}
    ).fetchone()
    if not suc:
        raise HTTPException(status_code=400, detail="Sucursal inexistente")


# --- Endpoints ---------------------------------------------------------- #

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request):
    _chequear_rate_limit("ip:" + (request.client.host if request.client else "desconocido"))
    _chequear_rate_limit("user:" + req.username.lower())

    with engine.connect() as conn:
        fila = conn.execute(
            text("SELECT id_usuario, password_hash, activo FROM usuarios WHERE username = :u"),
            {"u": req.username},
        ).fetchone()

    generico = HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
    if not fila:
        # Gastamos tiempo igual para no filtrar por timing si el usuario existe.
        bcrypt.checkpw(b"x", bcrypt.hashpw(b"x", bcrypt.gensalt()))
        raise generico

    user = dict(fila._mapping)
    try:
        ok = bcrypt.checkpw(req.password.encode("utf-8"), (user.get("password_hash") or "").encode("utf-8"))
    except ValueError:
        ok = False
    if not ok or not user.get("activo"):
        raise generico

    return {"access_token": crear_token_sesion(user["id_usuario"])}


@router.post("/refresh", response_model=TokenResponse)
def refresh(token: str = Depends(oauth2_scheme)):
    """Devuelve un token nuevo con el reloj reiniciado. El frontend lo llama en
    segundo plano mientras hay actividad, así el cajero no pierde la sesión a
    mitad de turno sin necesidad de tokens de larga duración."""
    return {"access_token": renovar_token_sesion(token)}


@router.post("/autorizar", response_model=AutorizacionResponse)
def autorizar(
    req: AutorizacionRequest,
    request: Request,
    solicitante: dict = Depends(get_current_user),
):
    """Autorización de supervisor/admin para una acción puntual (ej. un
    descuento que supera el tope del cajero), sin cerrar la sesión de quien
    está cobrando. Devuelve un token de un solo propósito, válido 3 minutos.
    """
    _chequear_rate_limit("ip:" + (request.client.host if request.client else "desconocido"))
    _chequear_rate_limit("user:" + req.username.lower())

    with engine.connect() as conn:
        fila = conn.execute(
            text("SELECT id_usuario, nombre, password_hash, id_rol, activo FROM usuarios WHERE username = :u"),
            {"u": req.username},
        ).fetchone()

    generico = HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")
    if not fila:
        bcrypt.checkpw(b"x", bcrypt.hashpw(b"x", bcrypt.gensalt()))
        raise generico

    user = dict(fila._mapping)
    try:
        ok = bcrypt.checkpw(req.password.encode("utf-8"), (user.get("password_hash") or "").encode("utf-8"))
    except ValueError:
        ok = False
    if not ok or not user.get("activo"):
        raise generico
    if user["id_rol"] not in (Rol.ADMIN, Rol.SUPERVISOR):
        raise HTTPException(status_code=403, detail="Ese usuario no puede autorizar descuentos")
    if user["id_usuario"] == solicitante["id_usuario"]:
        raise HTTPException(status_code=403, detail="No podés autorizarte a vos mismo")

    token = create_access_token(
        {
            "user_id": user["id_usuario"],
            "proposito": PROPOSITO_AUTORIZACION_DESCUENTO,
            "jti": uuid.uuid4().hex,
            # A quién se le concede (el cajero que lo pidió) y hasta qué % —
            # el pedido que lo consuma tiene que coincidir en ambas cosas.
            "sol": solicitante["id_usuario"],
            "max_desc_pct": round(req.descuento_pct, 2),
        },
        expires_delta=timedelta(minutes=AUTORIZACION_EXPIRA_MIN),
    )
    return {"token": token, "autorizado_por": user["nombre"]}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/", response_model=UsuarioOut, status_code=201)
def crear_usuario(payload: UsuarioCreate, _: dict = Depends(require_role(Rol.ADMIN))):
    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    with engine.begin() as conn:
        _validar(conn, payload.id_rol, payload.id_sucursal)
        existe = conn.execute(
            text("SELECT 1 FROM usuarios WHERE username = :u"), {"u": payload.username}
        ).fetchone()
        if existe:
            raise HTTPException(status_code=409, detail="El nombre de usuario ya existe")

        fila = conn.execute(
            text("""
                INSERT INTO usuarios (username, password_hash, nombre, apellido, id_rol, id_sucursal)
                VALUES (:username, :password_hash, :nombre, :apellido, :id_rol, :id_sucursal)
                RETURNING id_usuario, username, nombre, apellido, id_rol, id_sucursal, activo
            """),
            {
                "username": payload.username,
                "password_hash": password_hash,
                "nombre": payload.nombre,
                "apellido": payload.apellido,
                "id_rol": payload.id_rol,
                "id_sucursal": payload.id_sucursal,
            },
        ).fetchone()
    return dict(fila._mapping)


@router.get("/", response_model=list[UsuarioOut])
def listar_usuarios(_: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        filas = conn.execute(
            text("""
                SELECT id_usuario, username, nombre, apellido, id_rol, id_sucursal, activo
                FROM usuarios ORDER BY id_usuario
            """)
        )
        return [dict(f._mapping) for f in filas]


@router.put("/{id_usuario}", response_model=UsuarioOut)
def actualizar_usuario(id_usuario: int, payload: UsuarioUpdate, _: dict = Depends(require_role(Rol.ADMIN))):
    params = {
        "nombre": payload.nombre,
        "apellido": payload.apellido,
        "id_rol": payload.id_rol,
        "id_sucursal": payload.id_sucursal,
        "id_usuario": id_usuario,
    }
    extra = ""
    if payload.password:
        params["password_hash"] = bcrypt.hashpw(
            payload.password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        extra = ", password_hash = :password_hash"

    with engine.begin() as conn:
        _validar(conn, payload.id_rol, payload.id_sucursal)
        existe = conn.execute(
            text("SELECT 1 FROM usuarios WHERE id_usuario = :id"), {"id": id_usuario}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        fila = conn.execute(
            text(f"""
                UPDATE usuarios
                SET nombre = :nombre, apellido = :apellido, id_rol = :id_rol,
                    id_sucursal = :id_sucursal{extra}
                WHERE id_usuario = :id_usuario
                RETURNING id_usuario, username, nombre, apellido, id_rol, id_sucursal, activo
            """),
            params,
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_usuario}")
def desactivar_usuario(id_usuario: int, user: dict = Depends(require_role(Rol.ADMIN))):
    if id_usuario == user["id_usuario"]:
        raise HTTPException(status_code=400, detail="No podés desactivar tu propio usuario")

    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM usuarios WHERE id_usuario = :id"), {"id": id_usuario}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        conn.execute(
            text("UPDATE usuarios SET activo = FALSE WHERE id_usuario = :id"),
            {"id": id_usuario},
        )
    return {"mensaje": "Usuario desactivado"}


@router.post("/{id_usuario}/reactivar", response_model=UsuarioOut)
def reactivar_usuario(id_usuario: int, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM usuarios WHERE id_usuario = :id"), {"id": id_usuario}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        fila = conn.execute(
            text("""
                UPDATE usuarios SET activo = TRUE WHERE id_usuario = :id
                RETURNING id_usuario, username, nombre, apellido, id_rol, id_sucursal, activo
            """),
            {"id": id_usuario},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_usuario}/definitivo")
def borrar_definitivo(id_usuario: int, user: dict = Depends(require_role(Rol.ADMIN))):
    """Borra la fila de verdad. Solo si nada la referencia."""
    if id_usuario == user["id_usuario"]:
        raise HTTPException(status_code=400, detail="No podés borrar tu propio usuario")

    with engine.begin() as conexion:
        borrado.exigir_sin_referencias(conexion, borrado.USUARIO, id_usuario, "el usuario")
        borrado.borrar(conexion, "usuarios", "id_usuario", id_usuario, user)
    return {"mensaje": "Borrado definitivamente"}
