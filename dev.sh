#!/usr/bin/env bash
# Levanta TODO el entorno local en docker con recarga en vivo:
#   db + backend (:8000) + frontend (:5173).
# Ctrl+C corta todo. La data de la base NO se pierde (vive en un volumen).
set -euo pipefail
cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "Docker no está corriendo. Abrí Docker Desktop y esperá a que arranque."
  exit 1
fi

if [ ! -f .env ]; then
  echo "Falta el archivo .env en la raíz. Copiá .env.example a .env y completalo:"
  echo "  cp .env.example .env"
  exit 1
fi

echo "Levantando db + backend + frontend…  (Ctrl+C corta todo)"
echo "  Frontend  http://localhost:5173"
echo "  Backend   http://localhost:8000"
echo
exec docker compose up --build
