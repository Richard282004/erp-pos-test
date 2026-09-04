from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal
from sqlalchemy import text

from app import borrado
from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/insumos", tags=["Insumos"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)

_SELECT = """
    id_insumo, nombre, unidad, stock_actual, stock_minimo, costo_promedio, activo
"""


class InsumoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    unidad: Literal["g", "ml", "u"]
    stock_minimo: float = Field(0, ge=0, le=99_999_999)


class InsumoUpdate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    stock_minimo: float = Field(0, ge=0, le=99_999_999)


@router.get("/")
def listar_insumos(incluir_inactivos: bool = False, _: dict = Depends(_GESTOR)):
    filtro = "" if incluir_inactivos else "WHERE activo = TRUE"
    with engine.connect() as conn:
        filas = conn.execute(
            text(f"SELECT {_SELECT} FROM insumos {filtro} ORDER BY nombre")
        )
        return [dict(f._mapping) for f in filas]


@router.post("/", status_code=201)
def crear_insumo(payload: InsumoCreate, _: dict = Depends(_GESTOR)):
    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                INSERT INTO insumos (nombre, unidad, stock_minimo)
                VALUES (:nombre, :unidad, :stock_minimo)
                RETURNING {_SELECT}
            """),
            payload.model_dump(),
        ).fetchone()
    return dict(fila._mapping)


@router.put("/{id_insumo}")
def actualizar_insumo(id_insumo: int, payload: InsumoUpdate, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM insumos WHERE id_insumo = :id"), {"id": id_insumo}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                UPDATE insumos
                SET nombre = :nombre, stock_minimo = :stock_minimo
                WHERE id_insumo = :id_insumo
                RETURNING {_SELECT}
            """),
            {**payload.model_dump(), "id_insumo": id_insumo},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_insumo}")
def desactivar_insumo(id_insumo: int, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM insumos WHERE id_insumo = :id"), {"id": id_insumo}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE insumos SET activo = FALSE WHERE id_insumo = :id"),
            {"id": id_insumo},
        )
    return {"mensaje": "Insumo eliminado"}


@router.post("/{id_insumo}/reactivar")
def reactivar_insumo(id_insumo: int, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM insumos WHERE id_insumo = :id"), {"id": id_insumo}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                UPDATE insumos SET activo = TRUE WHERE id_insumo = :id
                RETURNING {_SELECT}
            """),
            {"id": id_insumo},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_insumo}/definitivo")
def borrar_definitivo(id_insumo: int, _: dict = Depends(_GESTOR)):
    """Borra la fila de verdad. Solo si nada la referencia."""
    with engine.begin() as conexion:
        borrado.exigir_sin_referencias(conexion, borrado.INSUMO, id_insumo, "el insumo")
        borrado.borrar(conexion, "insumos", "id_insumo", id_insumo)
    return {"mensaje": "Borrado definitivamente"}
