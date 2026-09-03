import os

from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine

# Cargar el .env más cercano (Backend/.env en local; en la nube las vars vienen del entorno).
load_dotenv(find_dotenv())

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
