from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text
from app.database import engine
from app.auth import get_current_user
from app.rbac import Rol, require_role

router = APIRouter(
    prefix="/productos",
    tags=["Productos"]
)


@router.get("/")
def obtener_productos(_: dict = Depends(get_current_user)):
    with engine.connect() as conexion:
        resultado = conexion.execute(
            text("""
                SELECT
                    p.id_producto,
                    p.nombre,
                    p.descripcion,
                    p.precio,
                    p.imagen_url,
                    p.activo,
                    c.nombre AS categoria
                FROM productos p
                JOIN categorias c
                    ON p.id_categoria = c.id_categoria
                WHERE p.activo = TRUE
                ORDER BY p.id_producto;
            """)
        )

        productos = [
            dict(fila._mapping)
            for fila in resultado
        ]

    return productos


class ProductoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    descripcion: Optional[str] = Field(None, max_length=400)
    precio: float = Field(..., ge=0, le=99_999_999)
    imagen_url: Optional[str] = Field(None, max_length=500)
    id_categoria: Optional[int] = None
    activo: bool = True


def _categoria_valida(conn, id_categoria: int) -> None:
    ok = conn.execute(
        text("SELECT 1 FROM categorias WHERE id_categoria = :c"), {"c": id_categoria}
    ).fetchone()
    if not ok:
        raise HTTPException(status_code=400, detail="Categoría inexistente")


@router.post("/", status_code=201)
def crear_producto(payload: ProductoCreate, _: dict = Depends(require_role(Rol.ADMIN, Rol.SUPERVISOR))):
    id_categoria = payload.id_categoria or 1
    with engine.begin() as conn:
        _categoria_valida(conn, id_categoria)
        nuevo = conn.execute(
            text("""
                INSERT INTO productos (nombre, descripcion, precio, imagen_url, id_categoria, activo)
                VALUES (:nombre, :descripcion, :precio, :imagen_url, :id_categoria, :activo)
                RETURNING id_producto
            """),
            {
                "nombre": payload.nombre,
                "descripcion": payload.descripcion,
                "precio": payload.precio,
                "imagen_url": payload.imagen_url,
                "id_categoria": id_categoria,
                "activo": payload.activo,
            },
        ).scalar()
    return {"id_producto": nuevo}


@router.put("/{id_producto}")
def actualizar_producto(id_producto: int, payload: ProductoCreate, _: dict = Depends(require_role(Rol.ADMIN, Rol.SUPERVISOR))):
    id_categoria = payload.id_categoria or 1
    with engine.begin() as conn:
        _categoria_valida(conn, id_categoria)
        res = conn.execute(
            text("""
                UPDATE productos
                SET nombre = :nombre, descripcion = :descripcion, precio = :precio,
                    imagen_url = :imagen_url, id_categoria = :id_categoria, activo = :activo
                WHERE id_producto = :id_producto
            """),
            {
                "nombre": payload.nombre,
                "descripcion": payload.descripcion,
                "precio": payload.precio,
                "imagen_url": payload.imagen_url,
                "id_categoria": id_categoria,
                "activo": payload.activo,
                "id_producto": id_producto,
            },
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"mensaje": "Producto actualizado"}


@router.delete("/{id_producto}")
def eliminar_producto(id_producto: int, user: dict = Depends(require_role(Rol.ADMIN, Rol.SUPERVISOR))):
    with engine.begin() as conn:
        # Soft delete: marcar como inactive
        conn.execute(
            text("""
                UPDATE productos SET activo = FALSE WHERE id_producto = :id_producto
            """), {"id_producto": id_producto}
        )

    return {"mensaje": "Producto eliminado"}


# --------------------------------------------------------------------------- #
# Recetas y costos (Inventario F1)
# --------------------------------------------------------------------------- #

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)


class RecetaLinea(BaseModel):
    id_insumo: int
    cantidad: float = Field(..., gt=0, le=9_999_999)


class RecetaInput(BaseModel):
    lineas: list[RecetaLinea] = Field(default_factory=list, max_length=50)


@router.get("/costos")
def productos_con_costo(_: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        filas = conn.execute(text("""
            SELECT
                p.id_producto,
                p.nombre,
                p.precio,
                c.nombre AS categoria,
                COALESCE(SUM(pi.cantidad * i.costo_promedio), 0) AS costo,
                COUNT(pi.id) AS lineas_receta
            FROM productos p
            JOIN categorias c ON c.id_categoria = p.id_categoria
            LEFT JOIN producto_insumos pi ON pi.id_producto = p.id_producto
            LEFT JOIN insumos i ON i.id_insumo = pi.id_insumo
            WHERE p.activo = TRUE
            GROUP BY p.id_producto, p.nombre, p.precio, c.nombre
            ORDER BY p.nombre
        """))
        return [dict(f._mapping) for f in filas]


@router.get("/{id_producto}/receta")
def obtener_receta(id_producto: int, _: dict = Depends(_GESTOR)):
    with engine.connect() as conn:
        filas = conn.execute(
            text("""
                SELECT
                    pi.id_insumo,
                    i.nombre,
                    i.unidad,
                    i.costo_promedio,
                    i.activo,
                    pi.cantidad,
                    (pi.cantidad * i.costo_promedio) AS subtotal
                FROM producto_insumos pi
                JOIN insumos i ON i.id_insumo = pi.id_insumo
                WHERE pi.id_producto = :id
                ORDER BY i.nombre
            """),
            {"id": id_producto},
        )
        return [dict(f._mapping) for f in filas]


@router.put("/{id_producto}/receta")
def guardar_receta(id_producto: int, payload: RecetaInput, _: dict = Depends(_GESTOR)):
    ids = [l.id_insumo for l in payload.lineas]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Hay un insumo repetido en la receta")

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
                    text("SELECT id_insumo FROM insumos WHERE id_insumo = ANY(:ids) AND activo = TRUE"),
                    {"ids": ids},
                )
            }
            faltan = set(ids) - validos
            if faltan:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insumos inexistentes o inactivos: {sorted(faltan)}",
                )

        conn.execute(
            text("DELETE FROM producto_insumos WHERE id_producto = :id"),
            {"id": id_producto},
        )
        for l in payload.lineas:
            conn.execute(
                text("""
                    INSERT INTO producto_insumos (id_producto, id_insumo, cantidad)
                    VALUES (:p, :i, :c)
                """),
                {"p": id_producto, "i": l.id_insumo, "c": l.cantidad},
            )

    return {"mensaje": "Receta guardada"}