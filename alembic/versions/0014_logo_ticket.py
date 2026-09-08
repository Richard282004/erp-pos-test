"""logo del negocio en el ticket del cliente

Revision ID: 0014_logo_ticket
Revises: 0013_anulacion
Create Date: 2026-09-08
"""
from alembic import op

revision = "0014_logo_ticket"
down_revision = "0013_anulacion"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ticket_logo_url VARCHAR(400)")
    op.execute(
        "ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ticket_mostrar_logo BOOLEAN NOT NULL DEFAULT TRUE"
    )


def downgrade():
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS ticket_mostrar_logo")
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS ticket_logo_url")
