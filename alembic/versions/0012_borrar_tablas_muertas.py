"""borrar tablas legadas que ningún código usa

Revision ID: 0012_tablas_muertas
Revises: 0011_login
Create Date: 2026-09-07

`detalle_pedido`, `detalle_pedido_modificadores` y `pedido_delivery` son de una
versión anterior del modelo. El código actual usa `pedido_items` /
`pedido_item_modificadores` y guarda el tipo de pedido (incl. DELIVERY) en la
propia tabla `pedidos`. Ninguna ruta ni migración las toca.

Se borran solo si están vacías. Si en producción tuvieran filas (no debería:
no hay forma de escribir en ellas), la migración falla a propósito para que
alguien revise antes de perder datos.

RECOMENDACIÓN: hacer un pg_dump de la base antes de aplicar esto.
"""
from alembic import op
import sqlalchemy as sa

revision = "0012_tablas_muertas"
down_revision = "0011_login"
branch_labels = None
depends_on = None

_MUERTAS = ("detalle_pedido_modificadores", "detalle_pedido", "pedido_delivery")


def upgrade():
    conn = op.get_bind()
    for tabla in _MUERTAS:
        existe = conn.execute(
            sa.text("SELECT to_regclass(:t)"), {"t": f"public.{tabla}"}
        ).scalar()
        if not existe:
            continue
        filas = conn.execute(sa.text(f"SELECT count(*) FROM {tabla}")).scalar()
        if filas:
            raise RuntimeError(
                f"La tabla legada '{tabla}' tiene {filas} filas. Revisá antes de "
                f"borrarla: puede haber datos que no esperabas."
            )
        op.execute(f"DROP TABLE IF EXISTS {tabla} CASCADE")


def downgrade():
    # No se recrean: eran estructuras muertas. Si hiciera falta, están en el
    # historial de git (schema.sql anterior a esta migración).
    pass
