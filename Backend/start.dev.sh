#!/bin/sh
# Arranque para desarrollo dentro de docker: migra y levanta la API con
# recarga automática al editar archivos (el código entra por un bind mount).
# El arranque de producción es start.sh.
set -e

cd /app
alembic upgrade head

cd /app/Backend
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/Backend
