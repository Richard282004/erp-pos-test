import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text

from app.database import engine
from app.fechas import TZ_NEGOCIO, filtro_rango, rango_dias
from app.rbac import Rol, require_role

router = APIRouter(prefix="/estadisticas", tags=["Estadisticas"])

_GESTOR = require_role(Rol.ADMIN, Rol.SUPERVISOR)
_TZ = TZ_NEGOCIO


def _csv_respuesta(filas: list[list], cabecera: list[str], nombre: str) -> Response:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")  # ; para que Excel en es-CL lo abra en columnas
    w.writerow(cabecera)
    w.writerows(filas)
    return Response(
        content="﻿" + buf.getvalue(),  # BOM: Excel reconoce el UTF-8 y los acentos
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )

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
    d_desde, d_hasta = rango_dias(desde, hasta)
    params = {"desde": d_desde, "hasta": d_hasta}
    # El día se mide en hora local del negocio, no en UTC.
    rango = filtro_rango("p.fecha_creacion")

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
                    SELECT (p.fecha_creacion AT TIME ZONE '{_TZ}')::date AS dia,
                           COUNT(*) AS pedidos,
                           COALESCE(SUM(p.total), 0) AS ventas
                    FROM pedidos p
                    WHERE {_NO_ANULADO} AND {rango}
                    GROUP BY (p.fecha_creacion AT TIME ZONE '{_TZ}')::date
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


@router.get("/ventas.csv")
def exportar_ventas(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    _: dict = Depends(_GESTOR),
):
    """Una fila por venta del período. Se abre en Excel."""
    d1, d2 = rango_dias(desde, hasta)
    with engine.connect() as conn:
        filas = [
            [
                r._mapping["numero"] if r._mapping["numero"] is not None else "",
                r._mapping["id_pedido"],
                r._mapping["fecha"].strftime("%Y-%m-%d"),
                r._mapping["fecha"].strftime("%H:%M"),
                r._mapping["id_turno"] if r._mapping["id_turno"] is not None else "",
                r._mapping["tipo_pedido"],
                r._mapping["estado"] or "",
                r._mapping["cajero"] or "",
                r._mapping["sucursal"] or "",
                float(r._mapping["subtotal"]),
                float(r._mapping["descuento"]),
                float(r._mapping["total"]),
                r._mapping["metodo_pago"] or "",
                float(r._mapping["recibido"]) if r._mapping["recibido"] is not None else "",
                float(r._mapping["vuelto"]) if r._mapping["vuelto"] is not None else "",
            ]
            for r in conn.execute(
                text("""
                    SELECT p.numero, p.id_pedido, p.id_turno,
                           p.fecha_creacion AT TIME ZONE :tz AS fecha,
                           p.tipo_pedido, p.estado, p.subtotal, p.descuento, p.total,
                           u.username AS cajero, s.nombre AS sucursal,
                           pg.metodo_pago, pg.monto_recibido AS recibido, pg.vuelto
                    FROM pedidos p
                    LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
                    LEFT JOIN sucursales s ON s.id_sucursal = p.id_sucursal
                    LEFT JOIN LATERAL (
                        SELECT metodo_pago, monto_recibido, vuelto
                        FROM pagos WHERE id_pedido = p.id_pedido ORDER BY id_pago LIMIT 1
                    ) pg ON TRUE
                    WHERE (p.fecha_creacion AT TIME ZONE 'America/Santiago')::date >= :desde
                      AND (p.fecha_creacion AT TIME ZONE 'America/Santiago')::date <= :hasta
                    ORDER BY p.id_pedido
                """),
                {"tz": _TZ, "desde": d1, "hasta": d2},
            )
        ]
    cabecera = [
        "Venta", "Registro", "Fecha", "Hora", "Turno", "Tipo", "Estado", "Cajero",
        "Sucursal", "Subtotal", "Descuento", "Total", "Medio de pago",
        "Monto recibido", "Vuelto",
    ]
    return _csv_respuesta(filas, cabecera, f"ventas_{d1}_{d2}.csv")


@router.get("/productos.csv")
def exportar_productos(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    _: dict = Depends(_GESTOR),
):
    """Unidades y monto vendido por producto en el período."""
    d1, d2 = rango_dias(desde, hasta)
    with engine.connect() as conn:
        filas = [
            [
                r._mapping["nombre"] or "—",
                int(r._mapping["unidades"]),
                float(r._mapping["monto"]),
            ]
            for r in conn.execute(
                text(f"""
                    SELECT pr.nombre,
                           SUM(pi.cantidad) AS unidades,
                           COALESCE(SUM(pi.cantidad * pi.precio * (1 - pi.descuento / 100.0)), 0) AS monto
                    FROM pedido_items pi
                    JOIN pedidos p ON p.id_pedido = pi.id_pedido
                    LEFT JOIN productos pr ON pr.id_producto = pi.id_producto
                    WHERE {_NO_ANULADO}
                      AND (p.fecha_creacion AT TIME ZONE 'America/Santiago')::date >= :desde
                      AND (p.fecha_creacion AT TIME ZONE 'America/Santiago')::date <= :hasta
                    GROUP BY pr.nombre
                    ORDER BY unidades DESC
                """),
                {"desde": d1, "hasta": d2},
            )
        ]
    return _csv_respuesta(filas, ["Producto", "Unidades", "Monto"], f"productos_{d1}_{d2}.csv")
