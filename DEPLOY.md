# Deploy — Byeburger (costo $0)

Stack: **Supabase** (Postgres) · **Render** (backend FastAPI) · **Vercel** (frontend).
Todo en capa gratis. Para *probar* está perfecto; para vender de verdad conviene pagar el plan de Render ($7) para que el backend no duerma.

Limitaciones de lo gratis:
- Render free **duerme tras 15 min** sin uso → el primer request tarda ~30-50 s, después normal.
- Supabase free **pausa la base tras 7 días** sin actividad → se despausa con 1 clic en el panel.

---

## 0. Subir el repo a GitHub

```bash
cd /Users/nskss07/Developer/Byeburger
git init
git add .
git commit -m "Byeburger POS"
# crear un repo vacío en github.com y:
git remote add origin https://github.com/TU_USUARIO/byeburger.git
git branch -M main
git push -u origin main
```

El `.gitignore` ya excluye `.env`, `node_modules`, venvs, etc.

---

## 1. Base de datos — Supabase

1. [supabase.com](https://supabase.com) → **New project**. Anotá la contraseña de la base.
2. **Project Settings → Database → Connection string → "Transaction pooler"** (URI, puerto **6543**).
   Se ve así:
   `postgresql://postgres.xxxx:CONTRASEÑA@aws-0-region.pooler.supabase.com:6543/postgres`
3. **SQL Editor → New query** → pegá **todo** el contenido de `Backend/scripts/schema.sql` → Run.
   Esto crea las 24 tablas.
4. Desde tu compu, con esa URL, corré las migraciones y el seed:

```bash
cd /Users/nskss07/Developer/Byeburger
export DATABASE_URL="postgresql://postgres.xxxx:CONTRASEÑA@aws-0-region.pooler.supabase.com:6543/postgres"

./Backend/venv/bin/alembic upgrade head

./Backend/venv/bin/python Backend/scripts/seed_inicial.py \
  --username admin --password "UNA_CLAVE_LARGA_Y_TUYA" \
  --nombre Tu --apellido Nombre --empresa "Byeburger" --sucursal "Local Centro"
```

Con eso la base queda con: 1 empresa, 3 roles, 5 categorías, 1 sucursal, 1 caja y el usuario admin. Sin datos de prueba.

---

## 2. Backend — Render

1. [render.com](https://render.com) → **New → Blueprint** → conectá el repo de GitHub.
   Render lee `render.yaml` y crea el servicio `byeburger-api`.
2. En **Environment** del servicio, completá las que dicen "sync: false":
   - `DATABASE_URL` = la URL del pooler de Supabase (paso 1.2)
   - `CORS_ORIGINS` = lo dejás vacío por ahora, lo completás en el paso 4
   - `JWT_SECRET` ya se genera solo.
3. Deploy. Cuando termine, la URL es algo como `https://byeburger-api.onrender.com`.
   Probá `https://byeburger-api.onrender.com/` → debe responder `{"servicio":"Byeburger API","estado":"ok"}`.

> El `start.sh` corre `alembic upgrade head` en cada deploy (es no-op si ya está al día).

---

## 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo.
2. **Root Directory** → `Frontend`.
3. **Environment Variables** → agregá:
   - `VITE_API_URL` = `https://byeburger-api.onrender.com` (la URL de Render, sin barra al final)
4. Deploy. La URL es algo como `https://byeburger.vercel.app`.

`Frontend/vercel.json` ya configura el framework (Vite) y el rewrite de SPA.

---

## 4. Conectar los dos

En **Render → byeburger-api → Environment**, poné:

```
CORS_ORIGINS = https://byeburger.vercel.app
```

(la URL exacta de Vercel, sin barra final; si querés varias, separá con coma)

Guardá → Render redeploya solo. Listo.

---

## 5. Probar

Abrí `https://byeburger.vercel.app`, entrá con `admin` / la clave que pusiste en el seed.
Pasale ese link a tu hermano.

---

## Actualizar después

Cada `git push` a `main` redeploya backend (Render) y frontend (Vercel) solos.
Cambios de esquema → creá una migración Alembic nueva; `start.sh` la aplica en el próximo deploy.

---

## Respaldos automáticos

El workflow `.github/workflows/backup.yml` hace un `pg_dump` completo cada 6
horas y lo deja como *artifact* del run (Actions → el run → "respaldo-...").
Retención 35 días. Cada 6 h (no 1 vez al día) para no perder más de ~6 h de
ventas si la base se cae.

**Activarlo:** GitHub → Settings → Secrets and variables → Actions → New secret:
- Nombre: `DATABASE_URL`
- Valor: la conexión **directa** de Supabase (Project Settings → Database →
  Connection string → **URI**, puerto **5432**, host `db.<ref>.supabase.co`).
  NO el pooler (6543).

Después, Actions → "Respaldo de la base" → "Run workflow" para probarlo
a mano una vez.

**Restaurar un respaldo:**
```bash
gunzip -c respaldo.sql.gz | psql "postgresql://...conexión-directa..."
```
El dump trae `--clean --if-exists`, así que reemplaza lo que haya. Probalo
primero contra una base vacía, no contra producción.

---

## Monitoreo (aviso por Telegram si se cae)

El workflow `.github/workflows/monitoreo.yml` pega a `/health` cada ~10 min y
te manda un Telegram cuando el backend **se cae** y cuando **vuelve** (solo en
el cambio, no te llena de mensajes).

**Activarlo:**
1. Telegram → escribile a **@BotFather** → `/newbot` → te da un **token**.
2. Telegram → escribile a **@userinfobot** → te da tu **chat id** (un número).
3. Escribile algo a tu bot nuevo (una vez), si no Telegram no lo deja mandarte nada.
4. GitHub → Settings → Secrets and variables → Actions → dos secrets:
   - `TELEGRAM_BOT_TOKEN` = el token de BotFather
   - `TELEGRAM_CHAT_ID` = el número de userinfobot
5. Actions → "Monitoreo del backend" → Run workflow, para probar.

**Ojo:** el cron de GitHub puede atrasarse. Para algo más fino, sumá
[UptimeRobot](https://uptimerobot.com) (gratis, chequeo cada 5 min, tiene
Telegram integrado): New monitor → HTTP(s) → `https://byeburger-api.onrender.com/health`.
