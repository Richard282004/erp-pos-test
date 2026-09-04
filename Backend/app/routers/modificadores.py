from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal, List
from sqlalchemy import text

from app import borrado
from app.database import engine
from app.rbac import Rol, require_role
from app.auth import get_current_user

router = APIRouter(prefix="/modificadores", tags=["Modificadores"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)

_SELECT = "id_modificador, nombre, tipo, precio_adicional, activo"


class ModificadorInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    tipo: Literal["AGREGAR", "QUITAR"]
    precio_adicional: float = Field(0, ge=0, le=99_999_999)


@router.get("/")
def listar_modificadores(incluir_inactivos: bool = False, user: dict = Depends(get_current_user)):
    filtro = "" if incluir_inactivos else "WHERE activo = TRUE"
    with engine.connect() as conn:
        filas = conn.execute(
            text(f"SELECT {_SELECT} FROM modificadores {filtro} ORDER BY tipo, nombre")
        )
        return [dict(f._mapping) for f in filas]


@router.get("/asociaciones")
def asociaciones(user: dict = Depends(get_current_user)):
    """{ id_producto: [id_modificador, ...] } — qué modificadores aplican a cada producto."""
    with engine.connect() as conn:
        filas = conn.execute(text("SELECT id_producto, id_modificador FROM producto_modificadores"))
        mapa: dict[int, list[int]] = {}
        for r in filas:
            mapa.setdefault(int(r._mapping["id_producto"]), []).append(int(r._mapping["id_modificador"]))
        return mapa


@router.post("/", status_code=201)
def crear_modificador(payload: ModificadorInput, _: dict = Depends(_GESTOR)):
    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                INSERT INTO modificadores (id_empresa, nombre, tipo, precio_adicional)
                VALUES (1, :nombre, :tipo, :precio_adicional)
                RETURNING {_SELECT}
            """),
            payload.model_dump(),
        ).fetchone()
    return dict(fila._mapping)


@router.put("/{id_modificador}")
def actualizar_modificador(id_modificador: int, payload: ModificadorInput, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM modificadores WHERE id_modificador = :id"), {"id": id_modificador}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")

    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                UPDATE modificadores
                SET nombre = :nombre, tipo = :tipo, precio_adicional = :precio_adicional
                WHERE id_modificador = :id
                RETURNING {_SELECT}
            """),
            {**payload.model_dump(), "id": id_modificador},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_modificador}")
def desactivar_modificador(id_modificador: int, _: dict = Depends(_GESTOR)):
    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM modificadores WHERE id_modificador = :id"), {"id": id_modificador}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Modificador no encontrado")
        conn.execute(
            text("UPDATE modificadores SET activo = FALSE WHERE id_modificador = :id"),
            {"id": id_modificador},
        )
        conn.execute(
            text("DELETE FROM producto_modificadores WHERE id_modificador = :id"),
            {"id": id_modificador},
        )
    return {"mensaje": "Modificador eliminado"}


@router.post("/{id_modificador}/reactivar")
def reactivar_modificador(id_modificador: int, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM modificadores WHERE id_modificador = :id"), {"id": id_modificador}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")
    with engine.begin() as conn:
        fila = conn.execute(
            text(f"UPDATE modificadores SET activo = TRUE WHERE id_modificador = :id RETURNING {_SELECT}"),
            {"id": id_modificador},
        ).fetchone()
    return dict(fila._mapping)


class ProductoModificadores(BaseModel):
    id_modificadores: List[int] = Field(default_factory=list, max_length=30)


@router.put("/producto/{id_producto}")
def set_modificadores_producto(
    id_producto: int, payload: ProductoModificadores, _: dict = Depends(_GESTOR)
):
    ids = list(set(payload.id_modificadores))
    with engine.begin() as conn:
        prod = conn.execute(
            text("SELECT 1 FROM productos WHERE id_producto = :id"), {"id": id_producto}
        ).fetchone()
        if not prod:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        if ids:
            validos = {
                int(r[0])
                for r in conn.execute(
                    text("SELECT id_modificador FROM modificadores WHERE id_modificador = ANY(:ids) AND activo = TRUE"),
                    {"ids": ids},
                )
            }
            faltan = set(ids) - validos
            if faltan:
                raise HTTPException(status_code=400, detail=f"Modificadores inválidos: {sorted(faltan)}")

        conn.execute(
            text("DELETE FROM producto_modificadores WHERE id_producto = :id"), {"id": id_producto}
        )
        for m in ids:
            conn.execute(
                text("INSERT INTO producto_modificadores (id_producto, id_modificador) VALUES (:p, :m)"),
                {"p": id_producto, "m": m},
            )
    return {"mensaje": "Modificadores del producto actualizados"}


@router.delete("/{id_modificador}/definitivo")
def borrar_definitivo(id_modificador: int, _: dict = Depends(_GESTOR)):
    """Borra la fila de verdad. Solo si nada la referencia."""
    with engine.begin() as conexion:
        borrado.exigir_sin_referencias(conexion, borrado.MODIFICADOR, id_modificador, "el modificador")
        borrado.borrar(conexion, "modificadores", "id_modificador", id_modificador)
    return {"mensaje": "Borrado definitivamente"}
