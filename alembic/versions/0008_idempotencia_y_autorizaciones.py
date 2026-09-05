"""idempotencia de cobros y autorizaciones de descuento de un solo uso

Revision ID: 0008_idempotencia
Revises: 0007_timestamptz
Create Date: 2026-09-05

- pedidos_idempotencia: si el cajero reintenta un cobro tras un corte de red,
  la misma clave devuelve el pedido ya creado en vez de crear otro.
- autorizaciones_usadas: el token de descuento del supervisor se marca acá al
  usarse; un segundo intento con el mismo token se rechaza.
"""
from alembic import op

revision = "0008_idempotencia"
down_revision = "0007_timestamptz"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS pedidos_idempotencia (
            clave       VARCHAR(64) PRIMARY KEY,
            id_pedido   INTEGER NOT NULL REFERENCES pedidos(id_pedido),
            id_usuario  INTEGER REFERENCES usuarios(id_usuario),
            creado      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_pedidos_idempotencia_creado "
        "ON pedidos_idempotencia (creado)"
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS autorizaciones_usadas (
            jti         VARCHAR(64) PRIMARY KEY,
            id_usuario  INTEGER REFERENCES usuarios(id_usuario),
            id_pedido   INTEGER,
            usado       TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS autorizaciones_usadas")
    op.execute("DROP TABLE IF EXISTS pedidos_idempotencia")
