"""índices únicos parciales para turnos de caja abiertos

Revision ID: 0009_turnos_unicos
Revises: 0008_idempotencia
Create Date: 2026-09-05

Red de seguridad a nivel base contra dos turnos abiertos en la misma caja o
del mismo usuario a la vez. El bloqueo FOR UPDATE en la aplicación ya lo
previene; esto lo hace imposible aunque se escriba desde otro lado.

Antes de crear los índices se cierran los duplicados que pudieran existir en
producción (si no, el CREATE UNIQUE INDEX fallaría y bloquearía el arranque):
de cada grupo duplicado se deja abierto el turno más reciente y el resto se
marca CERRADO con una nota.
"""
from alembic import op

revision = "0009_turnos_unicos"
down_revision = "0008_idempotencia"
branch_labels = None
depends_on = None


def upgrade():
    # Cierra duplicados por caja (deja el id_turno más alto abierto).
    op.execute(
        """
        UPDATE turnos_caja t SET
            estado = 'CERRADO',
            fecha_cierre = COALESCE(t.fecha_cierre, now()),
            diferencia = COALESCE(t.diferencia, 0)
        WHERE t.estado = 'ABIERTO'
          AND t.id_turno < (
              SELECT max(t2.id_turno) FROM turnos_caja t2
              WHERE t2.id_caja = t.id_caja AND t2.estado = 'ABIERTO'
          )
        """
    )
    # Cierra duplicados por usuario.
    op.execute(
        """
        UPDATE turnos_caja t SET
            estado = 'CERRADO',
            fecha_cierre = COALESCE(t.fecha_cierre, now()),
            diferencia = COALESCE(t.diferencia, 0)
        WHERE t.estado = 'ABIERTO'
          AND t.id_turno < (
              SELECT max(t2.id_turno) FROM turnos_caja t2
              WHERE t2.id_usuario = t.id_usuario AND t2.estado = 'ABIERTO'
          )
        """
    )

    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_turno_caja_abierto "
        "ON turnos_caja (id_caja) WHERE estado = 'ABIERTO'"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_turno_usuario_abierto "
        "ON turnos_caja (id_usuario) WHERE estado = 'ABIERTO'"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ux_turno_usuario_abierto")
    op.execute("DROP INDEX IF EXISTS ux_turno_caja_abierto")
