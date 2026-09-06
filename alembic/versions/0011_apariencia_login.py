"""apariencia editable del login (título, subtítulo, logo, acento)

Revision ID: 0011_login
Revises: 0010_folio
Create Date: 2026-09-06
"""
from alembic import op

revision = "0011_login"
down_revision = "0010_folio"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS login_titulo VARCHAR(60)")
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS login_subtitulo VARCHAR(120)")
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS login_logo_url VARCHAR(400)")
    op.execute(
        "ALTER TABLE empresas ADD COLUMN IF NOT EXISTS login_mostrar_logo BOOLEAN NOT NULL DEFAULT TRUE"
    )
    op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS login_acento VARCHAR(9)")


def downgrade():
    for col in (
        "login_acento",
        "login_mostrar_logo",
        "login_logo_url",
        "login_subtitulo",
        "login_titulo",
    ):
        op.execute(f"ALTER TABLE empresas DROP COLUMN IF EXISTS {col}")
