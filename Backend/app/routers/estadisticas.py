from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import engine
from app.rbac import Rol, require_role

router = APIRouter(prefix="/estadisticas", tags=["Estadisticas"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)

# Costo de receta por producto (Σ cantidad_insumo × costo_promedio)
_COSTO_PROD = """
    WITH costo_prod AS (
        SELECT pins.id_producto, SUM(pins.cantidad * i.costo_promedio) AS costo_unit
        FROM producto_insumos pins
        JOIN insumos i ON i.id_insumo = pins.id_insumo
        GROUP BY pins.id_producto
    )
"""

_NO_ANULADO = "COALESCE(p.estado, '') <> 'CANCELADO'"


@router.get("/dashboard")
def dashboard(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    _: dict = Depends(_GESTOR),
):
    hoy = date.today()
    d_desde = desde or hoy
    d_hasta = hasta or hoy
    if d_hasta < d_desde:
        d_desde, d_hasta = d_hasta, d_desde
    # rango: [desde 00:00, hasta+1día 00:00)
    params = {"desde": d_desde, "hasta": d_hasta}
    rango = (
        "p.fecha_creacion >= :desde "
        "AND p.fecha_creacion < (CAST(:hasta AS date) + INTERVAL '1 day')"
    )

    with engine.connect() as conn:
        resumen = conn.execute(
            text(f"""
                SELECT
                    COUNT(*) AS pedidos,
                    COALESCE(SUM(p.total), 0) AS ventas,
                    COALESCE(AVG(p.total), 0) AS ticket_promedio
                FROM pedidos p
                WHERE {_NO_ANULADO} AND {rango}
            """),
            params,
        ).fetchone()._mapping

        costo = conn.execute(
            text(f"""
                {_COSTO_PROD}
                SELECT COALESCE(SUM(pi.cantidad * COALESCE(cp.costo_unit, 0)), 0) AS costo_total
                FROM pedido_items pi
                JOIN pedidos p ON p.id_pedido = pi.id_pedido
                LEFT JOIN costo_prod cp ON cp.id_producto = pi.id_producto
                WHERE {_NO_ANULADO} AND {rango}
            """),
            params,
        ).scalar()

        por_metodo = [
            {
                "metodo_pago": r._mapping["metodo_pago"],
                "pedidos": int(r._mapping["pedidos"]),
                "monto": float(r._mapping["monto"]),
            }
            for r in conn.execute(
                text(f"""
                    SELECT pg.metodo_pago,
                           COUNT(DISTINCT pg.id_pedido) AS pedidos,
                           COALESCE(SUM(pg.monto), 0) AS monto
                    FROM pagos pg
                    JOIN pedidos p ON p.id_pedido = pg.id_pedido
                    WHERE {_NO_ANULADO} AND {rango}
                    GROUP BY pg.metodo_pago
                    ORDER BY monto DESC
                """),
                params,
            )
        ]

        por_tipo = [
            {
                "tipo_pedido": r._mapping["tipo_pedido"],
                "pedidos": int(r._mapping["pedidos"]),
                "monto": float(r._mapping["monto"]),
            }
            for r in conn.execute(
                text(f"""
                    SELECT p.tipo_pedido,
                           COUNT(*) AS pedidos,
                           COALESCE(SUM(p.total), 0) AS monto
                    FROM pedidos p
                    WHERE {_NO_ANULADO} AND {rango}
                    GROUP BY p.tipo_pedido
                    ORDER BY monto DESC
                """),
                params,
            )
        ]

        por_dia = [
            {
                "dia": r._mapping["dia"].isoformat(),
                "pedidos": int(r._mapping["pedidos"]),
                "ventas": float(r._mapping["ventas"]),
            }
            for r in conn.execute(
                text(f"""
                    SELECT DATE(p.fecha_creacion) AS dia,
                           COUNT(*) AS pedidos,
                           COALESCE(SUM(p.total), 0) AS ventas
                    FROM pedidos p
                    WHERE {_NO_ANULADO} AND {rango}
                    GROUP BY DATE(p.fecha_creacion)
                    ORDER BY dia
                """),
                params,
            )
        ]

        top_productos = [
            {
                "id_producto": int(r._mapping["id_producto"]) if r._mapping["id_producto"] is not None else None,
                "nombre": r._mapping["nombre"] or "—",
                "cantidad": int(r._mapping["cantidad"]),
                "monto": float(r._mapping["monto"]),
            }
            for r in conn.execute(
                text(f"""
                    SELECT pi.id_producto,
                           pr.nombre,
                           SUM(pi.cantidad) AS cantidad,
                           COALESCE(SUM(pi.cantidad * pi.precio), 0) AS monto
                    FROM pedido_items pi
                    JOIN pedidos p ON p.id_pedido = pi.id_pedido
                    LEFT JOIN productos pr ON pr.id_producto = pi.id_producto
                    WHERE {_NO_ANULADO} AND {rango}
                    GROUP BY pi.id_producto, pr.nombre
                    ORDER BY cantidad DESC
                    LIMIT 10
                """),
                params,
            )
        ]

    ventas = float(resumen["ventas"])
    costo_total = float(costo or 0)
    ganancia = ventas - costo_total

    return {
        "desde": d_desde,
        "hasta": d_hasta,
        "resumen": {
            "pedidos": int(resumen["pedidos"]),
            "ventas": ventas,
            "ticket_promedio": float(resumen["ticket_promedio"]),
            "costo": costo_total,
            "ganancia_bruta": ganancia,
            "margen": (ganancia / ventas) if ventas > 0 else 0,
        },
        "por_metodo": por_metodo,
        "por_tipo": por_tipo,
        "por_dia": por_dia,
        "top_productos": top_productos,
    }
