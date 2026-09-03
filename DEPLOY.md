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
