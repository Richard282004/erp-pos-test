"""tabla de auditoria para anulaciones y borrados definitivos

Revision ID: 0006_auditoria
Revises: 0005_datos_ticket_empresa
Create Date: 2026-09-04
"""
from alembic import op

revision = "0006_auditoria"
down_revision = "0005_datos_ticket_empresa"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auditoria (
            id_auditoria SERIAL PRIMARY KEY,
            id_usuario   INTEGER REFERENCES usuarios(id_usuario),
            username     VARCHAR(60) NOT NULL,
            accion       VARCHAR(30) NOT NULL,
            entidad      VARCHAR(40) NOT NULL,
            id_entidad   INTEGER,
            detalle      TEXT,
            fecha        TIMESTAMP NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_auditoria_fecha ON auditoria (fecha DESC)"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS auditoria")
