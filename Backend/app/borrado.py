"""Borrado definitivo con verificación de referencias.

Desactivar es reversible; borrar de verdad no. Y varias tablas apuntan a
usuarios, sucursales o cajas: si se borra una fila referenciada, o revienta la
base o se lleva puesto el historial de ventas. Por eso, antes de borrar se
cuenta qué la está usando y, si hay algo, se responde 409 diciendo exactamente
qué lo impide.
"""
from fastapi import HTTPException
from sqlalchemy import text

from app import auditoria

# (tabla, columna, etiqueta legible)
Referencia = tuple[str, str, str]


def _existe(conn, tabla: str) -> bool:
    return bool(
        conn.execute(text("SELECT to_regclass(:t)"), {"t": f"public.{tabla}"}).scalar()
    )


def bloqueos(conn, referencias: list[Referencia], valor) -> list[str]:
    """Devuelve descripciones de lo que impide borrar. Vacío = se puede."""
    encontrados = []
    for tabla, columna, etiqueta in referencias:
        if not _existe(conn, tabla):
            continue
        n = conn.execute(
            text(f"SELECT count(*) FROM {tabla} WHERE {columna} = :v"), {"v": valor}
        ).scalar()
        if n:
            encontrados.append(f"{n} {etiqueta}")
    return encontrados


def exigir_sin_referencias(conn, referencias: list[Referencia], valor, que: str) -> None:
    encontrados = bloqueos(conn, referencias, valor)
    if encontrados:
        raise HTTPException(
            status_code=409,
            detail=(
                f"No se puede borrar definitivamente {que}: tiene "
                + ", ".join(encontrados)
                + ". Dejalo inactivo para conservar el historial."
            ),
        )


def borrar(conn, tabla: str, columna_id: str, valor, user: dict | None = None) -> None:
    res = conn.execute(
        text(f"DELETE FROM {tabla} WHERE {columna_id} = :v"), {"v": valor}
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="No existe")
    if user is not None:
        auditoria.registrar(conn, user, "BORRAR_DEFINITIVO", tabla, valor)


# --- referencias por recurso ---

USUARIO: list[Referencia] = [
    ("pedidos", "id_usuario", "pedidos"),
    ("pagos", "id_usuario", "pagos"),
    ("turnos_caja", "id_usuario", "turnos de caja"),
    ("movimientos_caja", "id_usuario", "movimientos de caja"),
    ("compras", "id_usuario", "compras"),
    ("movimientos_inventario", "id_usuario", "movimientos de inventario"),
]

SUCURSAL: list[Referencia] = [
    ("pedidos", "id_sucursal", "pedidos"),
    ("usuarios", "id_sucursal", "usuarios"),
    ("cajas", "id_sucursal", "cajas"),
]

CAJA: list[Referencia] = [
    ("turnos_caja", "id_caja", "turnos de caja"),
]

CATEGORIA: list[Referencia] = [
    ("productos", "id_categoria", "productos"),
]

INSUMO: list[Referencia] = [
    ("producto_insumos", "id_insumo", "líneas de receta"),
    ("compra_items", "id_insumo", "detalles de compra"),
    ("movimientos_inventario", "id_insumo", "movimientos de inventario"),
]

MODIFICADOR: list[Referencia] = [
    ("producto_modificadores", "id_modificador", "productos asociados"),
    ("pedido_item_modificadores", "id_modificador", "líneas de pedido"),
]
