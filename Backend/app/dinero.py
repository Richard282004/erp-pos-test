"""Aritmética de dinero con Decimal y una regla de redondeo única.

Todo cálculo monetario del servidor pasa por acá. Nunca `float`: `0.1 + 0.2`
no da `0.3` en binario y un centavo perdido en cada línea se acumula en el
arqueo de caja.
"""
from decimal import Decimal, ROUND_HALF_UP

CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")


def dec(valor) -> Decimal:
    """A Decimal desde int, str, float o Decimal (via str para no arrastrar
    el error binario del float)."""
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def redondear(valor) -> Decimal:
    """Cuantiza a 2 decimales con redondeo medio hacia arriba."""
    return dec(valor).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def porcentaje(base: Decimal, pct) -> Decimal:
    """`pct` por ciento de `base`, sin redondear (se redondea al final)."""
    return dec(base) * dec(pct) / Decimal(100)
