"""folio de venta por turno (reinicia al abrir caja)

Revision ID: 0010_folio
Revises: 0009_turnos_unicos
Create Date: 2026-09-06

El id_pedido es la clave interna y nunca reinicia. `numero` es el folio que
ve el cajero en el ticket: la venta 1, 2, 3... de ESE turno. Se calcula al
crear el pedido, con el turno bloqueado, así no hay dos folios iguales.

Los pedidos que ya existen quedan con numero NULL (no se puede reconstruir el
orden por turno con certeza) — el ticket cae al id_pedido en ese caso.
"""
from alembic import op

revision = "0010_folio"
down_revision = "0009_turnos_unicos"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero INTEGER")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_folio_turno "
        "ON pedidos (id_turno, numero) WHERE numero IS NOT NULL"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ux_pedido_folio_turno")
    op.execute("ALTER TABLE pedidos DROP COLUMN IF EXISTS numero")
