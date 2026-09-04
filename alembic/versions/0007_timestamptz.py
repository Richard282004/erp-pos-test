"""corregir columnas de fecha a timestamp con zona horaria

Todas estas columnas se creaban como "timestamp without time zone" con
valores guardados en UTC (now()/CURRENT_TIMESTAMP en un servidor que corre
en UTC). Sin el marcador de zona, al leerlas la API las devuelve como
"2026-09-04T18:05:03" — sin 'Z' ni offset — y el navegador las interpreta
como si esos dígitos ya fueran la hora local de Chile en vez de UTC.
Resultado real, verificado: un ticket cobrado a las 14:05 en Chile se
mostraba como las 18:05 — 4 horas tarde, siempre.

USING columna AT TIME ZONE 'UTC' le dice a Postgres "estos dígitos que ya
tenés son UTC, agregales la marca" — no cambia ni un dato, solo corrige
cómo se interpreta de ahí en adelante.

Revision ID: 0007_timestamptz
Revises: 0006_auditoria
Create Date: 2026-09-04
"""
from alembic import op

revision = "0007_timestamptz"
down_revision = "0006_auditoria"
branch_labels = None
depends_on = None

# (tabla, columna)
COLUMNAS = (
    ("cajas", "fecha_creacion"),
    ("categorias", "fecha_creacion"),
    ("empresas", "fecha_creacion"),
    ("modificadores", "fecha_creacion"),
    ("movimientos_caja", "fecha_movimiento"),
    ("pagos", "fecha_pago"),
    ("pedidos", "fecha_creacion"),
    ("productos", "fecha_creacion"),
    ("roles", "fecha_creacion"),
    ("sucursales", "fecha_creacion"),
    ("turnos_caja", "fecha_apertura"),
    ("turnos_caja", "fecha_cierre"),
    ("usuarios", "fecha_creacion"),
    ("auditoria", "fecha"),
)


def upgrade():
    for tabla, columna in COLUMNAS:
        op.execute(
            f"""
            ALTER TABLE {tabla}
            ALTER COLUMN {columna} TYPE timestamptz
            USING {columna} AT TIME ZONE 'UTC'
            """
        )


def downgrade():
    for tabla, columna in COLUMNAS:
        op.execute(
            f"""
            ALTER TABLE {tabla}
            ALTER COLUMN {columna} TYPE timestamp without time zone
            USING {columna} AT TIME ZONE 'UTC'
            """
        )
