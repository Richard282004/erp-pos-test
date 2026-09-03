---
tipo: referencia
actualizado: 2026-08-31
---

# Revisión de seguridad

Relacionado: [[00 - Índice]] · [[Modelo de datos]]

Auditoría + fixes del 31/08. 3 pasadas de revisión-corrección-reverificación.

## Corregido — crítico

| # | Problema | Fix |
|---|---|---|
| 1 | `JWT_SECRET` con default público `"dev-secret-change-me"` → cualquiera falsificaba un token de admin | `auth.py` **falla al arrancar** si no hay `JWT_SECRET` (>= 32 chars). Generado uno real en `Backend/.env`. |
| 2 | El **monto del pago venía del cliente** → se podía cobrar $1 por un pedido de $50.000 | `crear_pedido` fuerza `pago.monto = total` calculado por el servidor. |

## Corregido — alto

- **Validación de entrada** en todos los modelos de escritura: `cantidad > 0`, `descuento 0–100`, `tipo_pedido`/`metodo_pago` como `Literal`, `max_length` en todos los strings, techos numéricos. Antes se podía mandar cantidad negativa o 500% de descuento.
- **`pagos.py` eliminado** — router muerto (bug de doble `router =`) con un `POST /pagos` sin validar turno ni total. Los pagos se crean solo dentro de `crear_pedido`.
- **`GET /sucursales/`, `/productos/`, `/categorias/`** ahora exigen sesión (antes filtraban datos sin auth).
- **Turnos ajenos**: `movimientos`, `cerrar`, `corte` verifican que el turno sea del usuario (o admin/supervisor). Un cajero no puede tocar la caja de otro.
- **Usuario desactivado con token vivo** → ahora `get_current_user` devuelve 403 (antes el token de 15 min seguía sirviendo).
- **Rate limit** en `/usuarios/login`: 10 intentos / 5 min por IP.

## Corregido — medio / limpieza

- CORS y cookie `secure` configurables por env (`CORS_ORIGINS`, `COOKIE_SECURE`).
- Token del frontend: `localStorage` → `sessionStorage` (menor superficie ante XSS).
- Parámetros de fecha validados como `date` (antes un string malformado → 500).
- `crear/actualizar` de usuario y producto validan que la sucursal/categoría exista; `PUT` devuelve 404 si el id no existe.
- Login con comparación de tiempo constante (bcrypt siempre, exista o no el usuario) — no filtra si el username existe.
- Borrado: endpoint `refresh` roto (501), `create_refresh_token`, `passlib` sin usar, `/test-db`, `id_turno=1` hardcodeado, spam de líneas en blanco.
- `.gitignore` + `Backend/.env.example` agregados (el repo no es git todavía; cuando lo sea, `.env` no se sube).

## Auditado — sin hallazgos

- **SQL injection**: todas las queries usan parámetros bindeados. Las f-strings interpolan solo fragmentos internos fijos (whitelist de condiciones, constantes), nunca input del usuario.
- **XSS**: React escapa todo. Sin `dangerouslySetInnerHTML`, `innerHTML` ni `eval`. `imagen_url` solo va a `<img src>` (no ejecuta script).

## Pendiente (aceptable por ahora)

- Sin flow de refresh token → token de 15 min, se re-loguea. OK para un POS.
- 16 warnings de eslint `set-state-in-effect` — patrón preexistente de carga de datos, no son bugs, el build pasa.
- HTTPS / hardening de deploy — cuando se publique (poné `COOKIE_SECURE=true`).
- `id_empresa = 1` fijo — una sola empresa, no aplica todavía.
