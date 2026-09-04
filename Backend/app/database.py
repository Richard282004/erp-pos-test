import os

from dotenv import load_dotenv
from sqlalchemy import create_engine

# Backend/.env en local; en la nube las vars vienen del entorno y este archivo
# no existe. Se busca por ruta fija (dos niveles arriba de este módulo) para que
# funcione sin importar desde qué carpeta se arranque uvicorn.
_ENV = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(_ENV)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no está configurada. Añadí Backend/.env o exportá la variable."
    )

# Algunos proveedores entregan la URL como 'postgres://'; SQLAlchemy 2.0 exige 'postgresql://'.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # reconecta si la conexión quedó vieja (útil con hosts que duermen)
    pool_recycle=1800,
)
