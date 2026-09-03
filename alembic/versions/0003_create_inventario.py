"""create inventario tables (insumos, recetas, compras, movimientos)

Revision ID: 0003_create_inventario
Revises: 0002_create_roles_table
Create Date: 2026-08-31
"""
from alembic import op

revision = "0003_create_inventario"
down_revision = "0002_create_roles_table"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS insumos (
            id_insumo       SERIAL PRIMARY KEY,
            nombre          TEXT NOT NULL,
            unidad          TEXT NOT NULL,               -- 'g' | 'ml' | 'u'
            stock_actual    NUMERIC(14, 3) NOT NULL DEFAULT 0,
            stock_minimo    NUMERIC(14, 3) NOT NULL DEFAULT 0,
            costo_promedio  NUMERIC(14, 4) NOT NULL DEFAULT 0,
            activo          BOOLEAN NOT NULL DEFAULT TRUE,
            fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS producto_insumos (
            id           SERIAL PRIMARY KEY,
            id_producto  INTEGER NOT NULL REFERENCES productos (id_producto),
            id_insumo    INTEGER NOT NULL REFERENCES insumos (id_insumo),
            cantidad     NUMERIC(14, 3) NOT NULL,        -- en unidad base del insumo
            UNIQUE (id_producto, id_insumo)
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS compras (
            id_compra   SERIAL PRIMARY KEY,
            fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
            id_usuario  INTEGER REFERENCES usuarios (id_usuario),
            proveedor   TEXT,
            nota        TEXT,
            total       NUMERIC(14, 2) NOT NULL DEFAULT 0
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS compra_items (
            id               SERIAL PRIMARY KEY,
            id_compra        INTEGER NOT NULL REFERENCES compras (id_compra) ON DELETE CASCADE,
            id_insumo        INTEGER NOT NULL REFERENCES insumos (id_insumo),
            cantidad_compra  NUMERIC(14, 3) NOT NULL,    -- como se compro (ej 1)
            unidad_compra    TEXT NOT NULL,              -- 'kg' | 'g' | 'L' | 'ml' | 'u'
            cantidad_base    NUMERIC(14, 3) NOT NULL,    -- convertida a unidad base
            costo_total      NUMERIC(14, 2) NOT NULL     -- $ de la linea
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS movimientos_inventario (
            id_movimiento  SERIAL PRIMARY KEY,
            id_insumo      INTEGER NOT NULL REFERENCES insumos (id_insumo),
            tipo           TEXT NOT NULL,                -- COMPRA | CONSUMO | MERMA | AJUSTE
            cantidad       NUMERIC(14, 3) NOT NULL,      -- + entra / - sale (unidad base)
            costo_unitario NUMERIC(14, 4) NOT NULL DEFAULT 0,
            fecha          TIMESTAMPTZ NOT NULL DEFAULT now(),
            id_usuario     INTEGER REFERENCES usuarios (id_usuario),
            id_compra      INTEGER REFERENCES compras (id_compra),
            id_pedido      INTEGER REFERENCES pedidos (id_pedido),
            nota           TEXT
        )
        """
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_movimientos_insumo ON movimientos_inventario (id_insumo)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_producto_insumos_producto ON producto_insumos (id_producto)"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS movimientos_inventario")
    op.execute("DROP TABLE IF EXISTS compra_items")
    op.execute("DROP TABLE IF EXISTS compras")
    op.execute("DROP TABLE IF EXISTS producto_insumos")
    op.execute("DROP TABLE IF EXISTS insumos")
