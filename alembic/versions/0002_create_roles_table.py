"""create roles table and enforce FK on usuarios.id_rol

Revision ID: 0002_create_roles_table
Revises: 0001_create_pedido_items
Create Date: 2026-08-24
"""
from alembic import op

revision = '0002_create_roles_table'
down_revision = '0001_create_pedido_items'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotente: en varios entornos (incluido el actual) `roles` ya fue
    # creada manualmente fuera de Alembic junto con el resto del schema.
    # Este paso solo formaliza su existencia en el historial de migraciones.
    op.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            id_rol SERIAL PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL UNIQUE
        )
    """)

    op.execute("""
        INSERT INTO roles (id_rol, nombre) VALUES
            (1, 'ADMINISTRADOR'),
            (2, 'SUPERVISOR'),
            (3, 'CAJERO')
        ON CONFLICT (id_rol) DO NOTHING
    """)

    # Verifica por confrelid (tabla referenciada), no por nombre de
    # constraint, porque el FK ya existente en este entorno se llama
    # "fk_usuario_rol" y no "fk_usuarios_id_rol".
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE t.relname = 'usuarios'
                  AND c.contype = 'f'
                  AND c.confrelid = 'roles'::regclass
            ) THEN
                ALTER TABLE usuarios
                    ADD CONSTRAINT fk_usuarios_id_rol
                    FOREIGN KEY (id_rol) REFERENCES roles (id_rol);
            END IF;
        END
        $$;
    """)


def downgrade():
    op.execute("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS fk_usuarios_id_rol")
    op.execute("DROP TABLE IF EXISTS roles")
