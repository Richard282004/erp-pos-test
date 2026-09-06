import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from sqlalchemy import text

from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(prefix="/empresa", tags=["Empresa"])

_HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class EmpresaInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    razon_social: Optional[str] = Field(None, max_length=150)
    rut: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=150)
    sitio_web: Optional[str] = Field(None, max_length=150)
    mensaje_ticket: Optional[str] = Field(None, max_length=200)
    # Apariencia del login
    login_titulo: Optional[str] = Field(None, max_length=60)
    login_subtitulo: Optional[str] = Field(None, max_length=120)
    login_logo_url: Optional[str] = Field(None, max_length=400)
    login_mostrar_logo: bool = True
    login_acento: Optional[str] = Field(None, max_length=9)

    @field_validator("login_acento")
    @classmethod
    def _acento_hex(cls, v: Optional[str]) -> Optional[str]:
        if v and not _HEX.match(v):
            raise ValueError("El color de acento debe ser un hex, ej. #c98a2b")
        return v


_COLS = (
    "id_empresa, nombre, razon_social, rut, telefono, email, sitio_web, mensaje_ticket, "
    "login_titulo, login_subtitulo, login_logo_url, login_mostrar_logo, login_acento"
)

_SELECT_EMPRESA = f"""
    SELECT {_COLS}
    FROM empresas
    WHERE activo = TRUE
    ORDER BY id_empresa
    LIMIT 1
"""


@router.get("/login")
def apariencia_login():
    """Textos y logo del login. Sin autenticación: la página de login todavía
    no tiene sesión. Solo devuelve lo que ya se ve en esa pantalla."""
    with engine.connect() as conexion:
        fila = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()
    if not fila:
        return {"titulo": "Byeburger POS", "subtitulo": None, "logo_url": None, "mostrar_logo": True, "acento": None}
    return {
        "titulo": fila["login_titulo"] or fila["nombre"] or "Byeburger POS",
        "subtitulo": fila["login_subtitulo"],
        "logo_url": fila["login_logo_url"] if fila["login_mostrar_logo"] else None,
        "mostrar_logo": bool(fila["login_mostrar_logo"]),
        "acento": fila["login_acento"],
    }


@router.get("/")
def obtener_empresa(_: dict = Depends(get_current_user)):
    """Datos del negocio. Los usa la cabecera del ticket impreso."""
    with engine.connect() as conexion:
        fila = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()
    if not fila:
        raise HTTPException(status_code=404, detail="No hay empresa configurada")
    return dict(fila)


@router.get("/emisor")
def datos_emisor(user: dict = Depends(get_current_user)):
    """Empresa + sucursal del usuario, todo lo que va impreso arriba del ticket."""
    with engine.connect() as conexion:
        empresa = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()
        sucursal = conexion.execute(
            text("""
                SELECT nombre, direccion, comuna, telefono
                FROM sucursales
                WHERE id_sucursal = :id
            """),
            {"id": user.get("id_sucursal")},
        ).mappings().first()

    return {
        "empresa": dict(empresa) if empresa else None,
        "sucursal": dict(sucursal) if sucursal else None,
    }


@router.put("/")
def actualizar_empresa(payload: EmpresaInput, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.begin() as conexion:
        actual = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()
        if not actual:
            raise HTTPException(status_code=404, detail="No hay empresa configurada")

        conexion.execute(
            text("""
                UPDATE empresas
                SET nombre = :nombre,
                    razon_social = :razon_social,
                    rut = :rut,
                    telefono = :telefono,
                    email = :email,
                    sitio_web = :sitio_web,
                    mensaje_ticket = :mensaje_ticket,
                    login_titulo = :login_titulo,
                    login_subtitulo = :login_subtitulo,
                    login_logo_url = :login_logo_url,
                    login_mostrar_logo = :login_mostrar_logo,
                    login_acento = :login_acento
                WHERE id_empresa = :id
            """),
            {**payload.model_dump(), "id": actual["id_empresa"]},
        )
        fila = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()

    return dict(fila)
