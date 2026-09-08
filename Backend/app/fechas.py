"""Fechas en la zona horaria del negocio.

Las columnas de fecha son `timestamptz` (guardan el instante en UTC). Para
filtrar "por día" hay que hacerlo en la hora local: un pedido de las 22:00 en
Chile es de las 01:00 UTC del día siguiente, y si el corte fuera a medianoche
UTC caería en el día equivocado del reporte.
"""
from datetime import date, datetime, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

TZ_NEGOCIO = "America/Santiago"

_TZ: tzinfo
try:
    _TZ = ZoneInfo(TZ_NEGOCIO)
except ZoneInfoNotFoundError:
    # Sin la base de datos de zonas (imagen mínima sin `tzdata`): se usa un
    # offset fijo para no tumbar la app. Postgres tiene su propia base, así que
    # los filtros SQL con AT TIME ZONE siguen siendo correctos.
    _TZ = timezone(timedelta(hours=-3))


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
