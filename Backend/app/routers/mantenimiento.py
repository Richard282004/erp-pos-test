"""Reseteo del movimiento de prueba (pedidos, pagos, turnos, etc.), sin
tocar el catálogo. Es la versión desde el panel de Backend/scripts/
limpiar_transacciones.py — mismo criterio, mismas tablas.

A propósito NO hay un endpoint genérico de "borrar lo que sea": esto borra
específicamente el movimiento operativo, nada más.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app import auditoria
from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/mantenimiento", tags=["Mantenimiento"])

# Borrar todas las transacciones + la auditoría no es una tarea de mantenimiento
# rutinaria: es para vaciar un entorno de prueba. En producción queda apagado
# salvo que se defina explícitamente PERMITIR_LIMPIEZA_WEB=1 en el servidor
# (y lo suyo es quitarla de nuevo apenas se termina). Para un reseteo legítimo
# está Backend/scripts/limpiar_transacciones.py, que corre con acceso al server.
_LIMPIEZA_WEB_HABILITADA = os.getenv("PERMITIR_LIMPIEZA_WEB") == "1"
FRASE_CONFIRMACION = "BORRAR TODO"


class LimpiarRequest(BaseModel):
    confirmacion: str

# Mismo orden y mismas tablas que Backend/scripts/limpiar_transacciones.py.
TABLAS = (
    "auditoria",
    "pedido_item_modificadores",
    "pagos",
    "pedido_items",
    "pedidos",
    "movimientos_caja",
    "turnos_caja",
    "compra_detalles",
    "compras",
    "movimientos_inventario",
)


def _contar(conn) -> dict[str, int]:
    conteos = {}
    for tabla in TABLAS:
        existe = conn.execute(
            text("SELECT to_regclass(:t)"), {"t": f"public.{tabla}"}
        ).scalar()
        if existe:
            n = conn.execute(text(f"SELECT count(*) FROM {tabla}")).scalar()
            if n:
                conteos[tabla] = n
    return conteos


@router.get("/estado")
def estado(_: dict = Depends(require_role(Rol.ADMIN))):
    """Cuántas filas hay para borrar, sin borrar nada — para mostrar antes
    de confirmar."""
    with engine.connect() as conn:
        conteos = _contar(conn)
    return {"conteos": conteos, "total": sum(conteos.values())}


@router.post("/limpiar-transacciones")
def limpiar_transacciones(
    payload: LimpiarRequest, user: dict = Depends(require_role(Rol.ADMIN))
):
    if not _LIMPIEZA_WEB_HABILITADA:
        raise HTTPException(
            status_code=403,
            detail=(
                "El borrado de transacciones desde la web está deshabilitado. "
                "Se habilita con PERMITIR_LIMPIEZA_WEB=1 en el servidor, o se usa "
                "el script limpiar_transacciones.py."
            ),
        )
    if payload.confirmacion.strip() != FRASE_CONFIRMACION:
        raise HTTPException(
            status_code=400,
            detail=f'Confirmación incorrecta: escribí exactamente "{FRASE_CONFIRMACION}".',
        )

    with engine.begin() as conn:
        conteos = _contar(conn)
        total = sum(conteos.values())
        if total == 0:
            raise HTTPException(status_code=400, detail="No hay nada que borrar")

        for tabla in TABLAS:
            if tabla in conteos:
                conn.execute(text(f"TRUNCATE {tabla} RESTART IDENTITY CASCADE"))
        if conn.execute(text("SELECT to_regclass('public.insumos')")).scalar():
            conn.execute(text("UPDATE insumos SET stock_actual = 0, costo_promedio = 0"))

        # Se registra recién acá: la tabla auditoria se vacía arriba, así que
        # este es el primer evento de la auditoria nueva.
        auditoria.registrar(
            conn, user, "LIMPIAR_TRANSACCIONES", "sistema", None,
            detalle=f"{total} filas ({', '.join(f'{t}:{n}' for t, n in conteos.items())})",
        )

    return {"mensaje": "Transacciones borradas", "conteos": conteos, "total": total}
