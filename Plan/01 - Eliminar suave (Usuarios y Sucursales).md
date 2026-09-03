---
tipo: tarea
estado: hecho
prioridad: 1
---

# 01 — Eliminar suave (Usuarios y Sucursales)

Relacionado: [[Roadmap]] · [[Decisiones]]

## Objetivo

Que ADMIN pueda "eliminar" usuarios y sucursales sin romper datos históricos (pedidos, pagos referencian a estos registros).

## Estado actual

- **Backend ya lo soporta:**
  - `DELETE /usuarios/{id}` → `UPDATE usuarios SET activo = FALSE` (`Backend/app/routers/usuarios.py:187`). Bloquea auto-desactivarse.
  - `DELETE /sucursales/{id}` → `UPDATE sucursales SET activo = FALSE` (`Backend/app/routers/sucursales.py:89`).
- **Frontend ya tiene** botón "Desactivar" en ambas tablas (`UsuariosPage.tsx`, `SucursalesPage.tsx`).

## Cambios

### Backend
- `GET /sucursales/` hoy filtra `WHERE activo = TRUE`. Agregar query param `incluir_inactivas: bool = False` para que la pantalla admin pueda mostrarlas.
- `GET /usuarios/` ya devuelve todas (con campo `activo`). OK.
- Agregar endpoint reactivar:
  - `POST /usuarios/{id}/reactivar` → `activo = TRUE`
  - `POST /sucursales/{id}/reactivar` → `activo = TRUE`

### Frontend
- Renombrar botón "Desactivar" → **"Eliminar"** en ambas tablas.
- `confirm()` con texto claro ("Se ocultará. Los pedidos históricos se conservan.").
- Toggle **"Ver inactivos"** arriba de cada tabla.
- Filas inactivas: estilo atenuado + botón **"Reactivar"**.
- `Frontend/src/api/usuarios.ts` y `sucursales.ts`: agregar `reactivar*` y param `incluirInactivas`.

## Archivos

- `Backend/app/routers/sucursales.py`
- `Backend/app/routers/usuarios.py`
- `Frontend/src/pages/admin/UsuariosPage.tsx`
- `Frontend/src/pages/admin/SucursalesPage.tsx`
- `Frontend/src/api/usuarios.ts`
- `Frontend/src/api/sucursales.ts`

## Fuera de alcance

Borrado real de fila (DELETE físico). Descartado por FK con pedidos/pagos y por ser irreversible.
