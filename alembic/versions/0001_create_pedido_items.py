"""create pedido_items table

Revision ID: 0001_create_pedido_items
Revises:
Create Date: 2026-08-18
"""
from alembic import op

revision = "0001_create_pedido_items"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Idempotente: en varios entornos el esquema base se crea fuera de Alembic
    # (ver Backend/scripts/schema.sql). Esto solo garantiza que la tabla exista.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS pedido_items (
            id_item    SERIAL PRIMARY KEY,
            id_pedido  INTEGER NOT NULL,
            id_producto INTEGER NOT NULL,
            cantidad   INTEGER NOT NULL,
            precio     NUMERIC NOT NULL,
            descuento  NUMERIC DEFAULT 0
        )
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS pedido_items")
