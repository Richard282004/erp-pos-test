"""cantidad por modificador en un ítem de pedido (ej. "Extra tocino x2")

Revision ID: 0018_modificador_cantidad
Revises: 0017_tema
Create Date: 2026-09-10
"""
from alembic import op

revision = "0018_modificador_cantidad"
down_revision = "0017_tema"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE pedido_item_modificadores "
        "ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1"
    )


def downgrade():
    op.execute("ALTER TABLE pedido_item_modificadores DROP COLUMN IF EXISTS cantidad")
