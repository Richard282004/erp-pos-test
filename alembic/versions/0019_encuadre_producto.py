"""encuadre de foto por producto (posición x/y + zoom, no destructivo)

Revision ID: 0019_encuadre_producto
Revises: 0018_modificador_cantidad
Create Date: 2026-09-11
"""
from alembic import op

revision = "0019_encuadre_producto"
down_revision = "0018_modificador_cantidad"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE productos "
        "ADD COLUMN IF NOT EXISTS encuadre_x SMALLINT NOT NULL DEFAULT 50"
    )
    op.execute(
        "ALTER TABLE productos "
        "ADD COLUMN IF NOT EXISTS encuadre_y SMALLINT NOT NULL DEFAULT 50"
    )
    op.execute(
        "ALTER TABLE productos "
        "ADD COLUMN IF NOT EXISTS encuadre_zoom NUMERIC(3,2) NOT NULL DEFAULT 1.0"
    )
