"""anulación de venta con devolución explícita

Revision ID: 0013_anulacion
Revises: 0012_tablas_muertas
Create Date: 2026-09-07

Antes: anular una venta solo la marcaba CANCELADA y le agregaba texto a la
observación. La plata "desaparecía" del efectivo esperado sin dejar registro.

Ahora la anulación guarda motivo, quién y cuándo, y si hubo devolución de
dinero. Si la venta fue en efectivo y se devolvió, se registra un movimiento
de caja tipo DEVOLUCION — por eso se agrega ese tipo a la restricción.
"""
from alembic import op

revision = "0013_anulacion"
down_revision = "0012_tablas_muertas"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(200)")
    op.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS anulado_por VARCHAR(60)")
    op.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ")
    op.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS con_devolucion BOOLEAN")

    op.execute("ALTER TABLE movimientos_caja DROP CONSTRAINT IF EXISTS chk_tipo_movimiento")
    op.execute(
        """
        ALTER TABLE movimientos_caja ADD CONSTRAINT chk_tipo_movimiento
        CHECK (tipo_movimiento IN ('INGRESO', 'RETIRO', 'GASTO', 'AJUSTE', 'DEVOLUCION'))
        """
    )


def downgrade():
    op.execute("ALTER TABLE movimientos_caja DROP CONSTRAINT IF EXISTS chk_tipo_movimiento")
    op.execute(
        """
        ALTER TABLE movimientos_caja ADD CONSTRAINT chk_tipo_movimiento
        CHECK (tipo_movimiento IN ('INGRESO', 'RETIRO', 'GASTO', 'AJUSTE'))
        """
    )
    for col in ("con_devolucion", "anulado_en", "anulado_por", "motivo_anulacion"):
        op.execute(f"ALTER TABLE pedidos DROP COLUMN IF EXISTS {col}")
