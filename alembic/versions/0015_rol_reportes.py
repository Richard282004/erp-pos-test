"""rol REPORTES (solo lectura de reportes y turnos)

Revision ID: 0015_rol_reportes
Revises: 0014_logo_ticket
Create Date: 2026-09-08
"""
from alembic import op

revision = "0015_rol_reportes"
down_revision = "0014_logo_ticket"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        INSERT INTO roles (id_rol, nombre, descripcion, activo)
        VALUES (4, 'REPORTES', 'Solo lectura: dashboard, pedidos y turnos', TRUE)
        ON CONFLICT (id_rol) DO NOTHING
        """
    )


def downgrade():
    # Solo se borra si nadie lo tiene asignado, para no dejar usuarios sin rol.
    op.execute("DELETE FROM roles WHERE id_rol = 4 AND NOT EXISTS (SELECT 1 FROM usuarios WHERE id_rol = 4)")
