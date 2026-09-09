"""configuración de facturación electrónica (DTE)

Solo guarda la configuración. La emisión real (armar el documento, timbre,
envío al SII) se implementa aparte. DTE apagado por defecto: el POS sigue
emitiendo comprobantes internos hasta que se active y complete acá.

Revision ID: 0016_config_dte
Revises: 0015_rol_reportes
Create Date: 2026-09-08
"""
from alembic import op

revision = "0016_config_dte"
down_revision = "0015_rol_reportes"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS config_dte (
            id_config              INTEGER PRIMARY KEY DEFAULT 1,
            activado               BOOLEAN NOT NULL DEFAULT FALSE,
            proveedor              VARCHAR(30),
            ambiente               VARCHAR(20) NOT NULL DEFAULT 'certificacion',
            api_url                VARCHAR(300),
            api_token              VARCHAR(400),
            rut_emisor             VARCHAR(20),
            razon_social           VARCHAR(200),
            giro                   VARCHAR(200),
            codigo_actividad       VARCHAR(20),
            direccion_casa_matriz  VARCHAR(200),
            comuna_casa_matriz     VARCHAR(100),
            tipo_documento_default INTEGER NOT NULL DEFAULT 39,
            resolucion_numero      VARCHAR(20),
            resolucion_fecha       DATE,
            fecha_actualizacion    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_config_dte_fila_unica CHECK (id_config = 1),
            CONSTRAINT chk_config_dte_ambiente CHECK (ambiente IN ('certificacion', 'produccion')),
            CONSTRAINT chk_config_dte_tipo_doc CHECK (tipo_documento_default IN (33, 39))
        )
        """
    )
    op.execute("INSERT INTO config_dte (id_config) VALUES (1) ON CONFLICT (id_config) DO NOTHING")


def downgrade():
    op.execute("DROP TABLE IF EXISTS config_dte")
