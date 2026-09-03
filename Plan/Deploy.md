---
tipo: referencia
estado: en producción
actualizado: 2026-09-03
---

# Deploy

Relacionado: [[00 - Índice]] · [[Seguridad]]

Objetivo: que el hermano (otra ciudad) pruebe el sistema remoto. **Costo $0.**

## En vivo

| Parte | URL |
|---|---|
| Frontend | https://erp-pos-test.vercel.app |
| API | https://byeburger-api.onrender.com |
| Base | Supabase, pooler `aws-0-us-east-1`, puerto 6543 |

Repo: `Richard282004/erp-pos-test`, rama `master`. Cada push redeploya Vercel y Render.

Verificado end-to-end el 2026-09-03: preflight CORS OK, login devuelve token, `/usuarios/me`, `/productos/`, `/categorias/` y `/caja/turno-actual` responden 200.

## Stack elegido

| Parte | Servicio | Nota |
|---|---|---|
| Base de datos | **Supabase** Postgres (free) | pausa tras 7 días sin uso |
| Backend FastAPI | **Render** web service (free, Docker) | duerme tras 15 min → cold start ~30-50s |
| Frontend | **Vercel** (free) | — |

Por qué no "todo Supabase": el backend tiene lógica propia (precios server-side, turno, costeo) que la API automática de Supabase no hace, y sus Edge Functions son Deno/TS, no Python. Render corre el FastAPI tal cual.

## Preparación hecha (código)

- `git init` + commit inicial (139 archivos, sin `.env` ni venvs).
- `Backend/Dockerfile` reescrito: prod, usa `$PORT`, corre `Backend/start.sh` → `alembic upgrade head` + `uvicorn`.
- `Backend/app/database.py`: `pool_pre_ping`, arregla `postgres://` → `postgresql://`, sacado `SessionLocal` sin uso.
- Migración `0001` ahora idempotente (`CREATE TABLE IF NOT EXISTS`) → `alembic upgrade head` funciona sobre una base ya creada por `schema.sql`.
- `Backend/scripts/schema.sql` — dump completo del esquema (24 tablas) para bootstrapear Supabase.
- `Backend/scripts/seed_inicial.py` — datos mínimos limpios (empresa, 3 roles, 5 categorías, 1 sucursal, 1 caja) + usuario admin. Idempotente.
- `Frontend/Dockerfile` multi-stage (build + nginx), `Frontend/nginx.conf` (SPA), `Frontend/vercel.json`.
- `docker-compose.yml` sin secretos hardcodeados (salen de `.env`).
- `render.yaml` (Blueprint) + `DEPLOY.md` (guía paso a paso).

## Probado

Bootstrap completo sobre una base vacía: `schema.sql` → `alembic upgrade head` → `seed_inicial.py` → la API arranca, login OK, se crea producto, se abre turno y se cobra. IDs desde 1.

## Pendiente (lo hace el usuario)

Cuentas + pasos en [[DEPLOY.md|DEPLOY.md]] (raíz del repo):
1. Push a GitHub
2. Supabase: crear proyecto, correr `schema.sql`, correr alembic + seed con la URL del pooler
3. Render: Blueprint desde el repo, pegar `DATABASE_URL` y `CORS_ORIGINS`
4. Vercel: importar, root `Frontend/`, `VITE_API_URL` = URL de Render
5. Actualizar `CORS_ORIGINS` en Render con la URL de Vercel

Cada `git push` después redeploya solo.
