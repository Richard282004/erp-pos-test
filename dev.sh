#!/usr/bin/env bash
# Levanta TODO el entorno local con un comando:
#   ./dev.sh
#
#   - Base de datos  -> contenedor docker (burger-pos-db, puerto 5434)
#   - Backend        -> http://localhost:8000   (uvicorn --reload)
#   - Frontend       -> http://localhost:5173   (vite dev)
#
# Ctrl+C corta los tres. La data de la base NO se pierde (vive en un volumen).
set -euo pipefail
cd "$(dirname "$0")"

# --- chequeos rápidos ------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "Docker no está corriendo. Abrí Docker Desktop y esperá a que arranque."
  exit 1
fi
if [ ! -x Backend/venv/bin/uvicorn ]; then
  echo "Falta el venv del backend:  cd Backend && python3 -m venv venv && venv/bin/pip install -r requirements-dev.txt"
  exit 1
fi
if [ ! -d Frontend/node_modules ]; then
  echo "Faltan las dependencias del frontend:  cd Frontend && npm install"
  exit 1
fi
for p in 8000 5173; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo "El puerto $p ya está ocupado. Revisá con:  lsof -iTCP:$p -sTCP:LISTEN"
    exit 1
  fi
done

# --- base de datos -------------------------------------------------------
echo "→ Base de datos (docker)…"
docker compose up -d db
printf "  esperando"
until docker compose exec -T db pg_isready -q >/dev/null 2>&1; do printf .; sleep 1; done
echo " lista"

# --- backend + frontend ------------------------------------------------
trap 'echo; echo "Cortando…"; kill 0' EXIT

( cd Backend && exec venv/bin/uvicorn app.main:app --reload ) &
( cd Frontend && exec npm run dev ) &

echo
echo "  Backend   http://localhost:8000"
echo "  Frontend  http://localhost:5173"
echo "  (Ctrl+C corta todo)"
echo
wait
