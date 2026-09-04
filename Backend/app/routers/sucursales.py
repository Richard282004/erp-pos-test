from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text

from app import borrado
from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(
    prefix="/sucursales",
    tags=["Sucursales"]
)


class SucursalInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    direccion: Optional[str] = Field(None, max_length=200)
    comuna: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=40)


@router.get("/")
def obtener_sucursales(incluir_inactivas: bool = False, _: dict = Depends(get_current_user)):
    filtro = "" if incluir_inactivas else "WHERE activo = TRUE"
    with engine.connect() as conexion:
        resultado = conexion.execute(
            text(f"""
                SELECT
                    id_sucursal,
                    nombre,
                    direccion,
                    comuna,
                    telefono,
                    activo
                FROM sucursales
                {filtro}
                ORDER BY id_sucursal;
            """)
        )

        sucursales = [
            dict(fila._mapping)
            for fila in resultado
        ]

    return sucursales


@router.post("/", status_code=201)
def crear_sucursal(payload: SucursalInput, _: dict = Depends(require_role(Rol.ADMIN))):
    # id_empresa fijo en 1: hoy existe una sola empresa, no hay gestión de
    # empresas todavía (fuera de alcance).
    with engine.begin() as conn:
        fila = conn.execute(
            text("""
                INSERT INTO sucursales (id_empresa, nombre, direccion, comuna, telefono)
                VALUES (1, :nombre, :direccion, :comuna, :telefono)
                RETURNING id_sucursal, nombre, direccion, comuna, telefono, activo
            """),
            payload.model_dump(),
        ).fetchone()

    return dict(fila._mapping)


@router.put("/{id_sucursal}")
def actualizar_sucursal(id_sucursal: int, payload: SucursalInput, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM sucursales WHERE id_sucursal = :id"),
            {"id": id_sucursal},
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    with engine.begin() as conn:
        fila = conn.execute(
            text("""
                UPDATE sucursales
                SET nombre = :nombre, direccion = :direccion, comuna = :comuna, telefono = :telefono
                WHERE id_sucursal = :id_sucursal
                RETURNING id_sucursal, nombre, direccion, comuna, telefono, activo
            """),
            {**payload.model_dump(), "id_sucursal": id_sucursal},
        ).fetchone()

    return dict(fila._mapping)


@router.delete("/{id_sucursal}")
def desactivar_sucursal(id_sucursal: int, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM sucursales WHERE id_sucursal = :id"),
            {"id": id_sucursal},
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE sucursales SET activo = FALSE WHERE id_sucursal = :id_sucursal"),
            {"id_sucursal": id_sucursal},
        )

    return {"mensaje": "Sucursal desactivada"}


@router.post("/{id_sucursal}/reactivar")
def reactivar_sucursal(id_sucursal: int, _: dict = Depends(require_role(Rol.ADMIN))):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM sucursales WHERE id_sucursal = :id"),
            {"id": id_sucursal},
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE sucursales SET activo = TRUE WHERE id_sucursal = :id_sucursal"),
            {"id_sucursal": id_sucursal},
        )

    return {"mensaje": "Sucursal reactivada"}


@router.delete("/{id_sucursal}/definitivo")
def borrar_definitivo(id_sucursal: int, _: dict = Depends(require_role(Rol.ADMIN))):
    """Borra la fila de verdad. Solo si nada la referencia."""
    with engine.begin() as conexion:
        borrado.exigir_sin_referencias(conexion, borrado.SUCURSAL, id_sucursal, "la sucursal")
        borrado.borrar(conexion, "sucursales", "id_sucursal", id_sucursal)
    return {"mensaje": "Borrado definitivamente"}
