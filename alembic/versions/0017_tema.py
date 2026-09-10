"""apariencia editable: acento, modo (claro/oscuro/sistema) y bordes

Revision ID: 0017_tema
Revises: 0016_config_dte
Create Date: 2026-09-10
"""
from alembic import op

revision = "0017_tema"
down_revision = "0016_config_dte"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tema_acento VARCHAR(9)")
    op.execute(
        "ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tema_modo VARCHAR(10) NOT NULL DEFAULT 'sistema'"
    )
    op.execute(
        "ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tema_radio VARCHAR(12) NOT NULL DEFAULT 'suave'"
    )
    # El acento del login pasa a ser el acento de toda la app.
    op.execute("UPDATE empresas SET tema_acento = login_acento WHERE tema_acento IS NULL AND login_acento IS NOT NULL")


def downgrade():
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS tema_radio")
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS tema_modo")
    op.execute("ALTER TABLE empresas DROP COLUMN IF EXISTS tema_acento")
