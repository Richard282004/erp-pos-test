"""Fechas en la zona horaria del negocio.

Las columnas de fecha son `timestamptz` (guardan el instante en UTC). Para
filtrar "por día" hay que hacerlo en la hora local: un pedido de las 22:00 en
Chile es de las 01:00 UTC del día siguiente, y si el corte fuera a medianoche
UTC caería en el día equivocado del reporte.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo

TZ_NEGOCIO = "America/Santiago"
_TZ = ZoneInfo(TZ_NEGOCIO)


def hoy_local() -> date:
    return datetime.now(_TZ).date()


def rango_dias(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Normaliza un rango [desde, hasta]; por defecto, hoy."""
    hoy = hoy_local()
    d1 = desde or hoy
    d2 = hasta or hoy
    if d2 < d1:
        d1, d2 = d2, d1
    return d1, d2


# Fragmento SQL: la columna `col` (timestamptz) cae dentro de [:desde, :hasta]
# medido en hora local. Usar con params {"desde": date, "hasta": date}.
def filtro_rango(col: str) -> str:
    return (
        f"(({col}) AT TIME ZONE '{TZ_NEGOCIO}')::date >= :desde "
        f"AND (({col}) AT TIME ZONE '{TZ_NEGOCIO}')::date <= :hasta"
    )
