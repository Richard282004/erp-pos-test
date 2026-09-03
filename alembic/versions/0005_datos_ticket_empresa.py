"""campos de la empresa que salen impresos en el ticket

Revision ID: 0005_datos_ticket_empresa
Revises: 0004_pedido_item_modificadores
Create Date: 2026-09-03
"""
from alembic import op

revision = "0005_datos_ticket_empresa"
down_revision = "0004_pedido_item_modificadores"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sitio_web VARCHAR(150)")
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mensaje_ticket VARCHAR(200)")


def downgrade():
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS mensaje_ticket")
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS sitio_web")
