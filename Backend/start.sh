#!/bin/sh
set -e

# Migraciones antes de arrancar (alembic.ini y alembic/ están en la raíz del proyecto).
cd /app
alembic upgrade head

# Servir la API. Render (y otros) inyectan $PORT.
cd /app/Backend
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
