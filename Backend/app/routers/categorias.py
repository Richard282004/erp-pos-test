from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text

from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(prefix="/categorias", tags=["Categorias"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)

_SELECT = "id_categoria, id_empresa, nombre, descripcion, activo"


@router.get("/")
def obtener_categorias(incluir_inactivas: bool = False, _: dict = Depends(get_current_user)):
    filtro = "" if incluir_inactivas else "WHERE activo = TRUE"
    with engine.connect() as conexion:
        resultado = conexion.execute(
            text(f"SELECT {_SELECT} FROM categorias {filtro} ORDER BY nombre")
        )
        return [dict(fila._mapping) for fila in resultado]


class CategoriaInput(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    descripcion: Optional[str] = Field(None, max_length=200)


@router.post("/", status_code=201)
def crear_categoria(payload: CategoriaInput, _: dict = Depends(_GESTOR)):
    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                INSERT INTO categorias (id_empresa, nombre, descripcion)
                VALUES (1, :nombre, :descripcion)
                RETURNING {_SELECT}
            """),
            payload.model_dump(),
        ).fetchone()
    return dict(fila._mapping)


@router.put("/{id_categoria}")
def actualizar_categoria(id_categoria: int, payload: CategoriaInput, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM categorias WHERE id_categoria = :id"), {"id": id_categoria}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    with engine.begin() as conn:
        fila = conn.execute(
            text(f"""
                UPDATE categorias
                SET nombre = :nombre, descripcion = :descripcion
                WHERE id_categoria = :id
                RETURNING {_SELECT}
            """),
            {**payload.model_dump(), "id": id_categoria},
        ).fetchone()
    return dict(fila._mapping)


@router.delete("/{id_categoria}")
def desactivar_categoria(id_categoria: int, _: dict = Depends(_GESTOR)):
    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM categorias WHERE id_categoria = :id"), {"id": id_categoria}
        ).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")

        activos = conn.execute(
            text("SELECT COUNT(*) FROM productos WHERE id_categoria = :id AND activo = TRUE"),
            {"id": id_categoria},
        ).scalar()

        conn.execute(
            text("UPDATE categorias SET activo = FALSE WHERE id_categoria = :id"),
            {"id": id_categoria},
        )
    return {"mensaje": "Categoría eliminada", "productos_activos": int(activos or 0)}


@router.post("/{id_categoria}/reactivar")
def reactivar_categoria(id_categoria: int, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM categorias WHERE id_categoria = :id"), {"id": id_categoria}
        ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    with engine.begin() as conn:
        fila = conn.execute(
            text(f"UPDATE categorias SET activo = TRUE WHERE id_categoria = :id RETURNING {_SELECT}"),
            {"id": id_categoria},
        ).fetchone()
    return dict(fila._mapping)


@router.get("/uso")
def uso_categorias(_: dict = Depends(_GESTOR)):
    """Cuántos productos activos tiene cada categoría."""
    with engine.connect() as conn:
        filas = conn.execute(text("""
            SELECT c.id_categoria, COUNT(p.id_producto) AS productos
            FROM categorias c
            LEFT JOIN productos p ON p.id_categoria = c.id_categoria AND p.activo = TRUE
            GROUP BY c.id_categoria
        """))
        return {int(r._mapping["id_categoria"]): int(r._mapping["productos"]) for r in filas}
