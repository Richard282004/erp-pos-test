"""link modificadores to pedido_items

Revision ID: 0004_pedido_item_modificadores
Revises: 0003_create_inventario
Create Date: 2026-08-31
"""
from alembic import op

revision = "0004_pedido_item_modificadores"
down_revision = "0003_create_inventario"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS pedido_item_modificadores (
            id                SERIAL PRIMARY KEY,
            id_item           INTEGER NOT NULL REFERENCES pedido_items (id_item) ON DELETE CASCADE,
            id_modificador    INTEGER NOT NULL REFERENCES modificadores (id_modificador),
            nombre            TEXT NOT NULL,
            precio_adicional  NUMERIC(12, 2) NOT NULL DEFAULT 0
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_pim_item ON pedido_item_modificadores (id_item)"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS pedido_item_modificadores")
