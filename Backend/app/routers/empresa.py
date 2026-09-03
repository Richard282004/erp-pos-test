from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text

from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(prefix="/empresa", tags=["Empresa"])


class EmpresaInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    razon_social: Optional[str] = Field(None, max_length=150)
    rut: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=150)
    sitio_web: Optional[str] = Field(None, max_length=150)
    mensaje_ticket: Optional[str] = Field(None, max_length=200)


_SELECT_EMPRESA = """
    SELECT id_empresa, nombre, razon_social, rut, telefono, email,
           sitio_web, mensaje_ticket
    FROM empresas
    WHERE activo = TRUE
    ORDER BY id_empresa
    LIMIT 1
"""


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
                    mensaje_ticket = :mensaje_ticket
                WHERE id_empresa = :id
            """),
            {**payload.model_dump(), "id": actual["id_empresa"]},
        )
        fila = conexion.execute(text(_SELECT_EMPRESA)).mappings().first()

    return dict(fila)
