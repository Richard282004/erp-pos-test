---
tipo: roadmap
actualizado: 2026-08-31
---

# Roadmap

Orden acordado: cosas cortas y visibles primero, inventario en fases.

| # | Tarea | Estado | Nota |
|---|---|---|---|
| 1 | [[01 - Eliminar suave (Usuarios y Sucursales)]] | Hecho | Renombre + toggle inactivos + reactivar |
| 2 | [[02 - Login]] | Hecho | Página `/login` + guard `RequireAuth` |
| 3 | [[03 - Rediseño visual ERP]] | Hecho | "Turno noche" + tema claro/oscuro con toggle |
| 4 | [[04 - Inventario]] F1 | Hecho | Grupos admin + insumos + compras + recetas + costo/margen |
| — | [[Imprescindibles ERP-POS]] | ✅ COMPLETO (A–F) | Lo mínimo para operar en el local (ver abajo) |
| 5 | [[04 - Inventario]] F2 | Futuro | Descuento automático de stock + alertas |
| 6 | [[04 - Inventario]] F3 | Futuro | Mermas + conteo físico |
| 7 | [[04 - Inventario]] F4 | Futuro | Reportes + proveedores |

## Imprescindibles ERP-POS ([[Imprescindibles ERP-POS]])

| | Bloque | Estado |
|---|---|---|
| A | Caja y turnos + CRUD cajas + historial/corte Z | ✅ |
| B | Pedidos: lista del día + detalle + anular | ✅ |
| C | Categorías CRUD | ✅ |
| D | Modificadores (admin + POS) | ✅ |
| E | Impresión ticket + comanda | ✅ |
| F | Dashboard ventas + ganancia | ✅ |

## F1 — pasos ([[04 - Inventario]])

1. Reorg sidebar admin en grupos ([[Administración (estructura)]])
2. Migración Alembic `0003` + `alembic upgrade head`
3. Backend insumos + compras/movimientos
4. Frontend Insumos + Compras
5. Backend receta + costo
6. Frontend Recetas + costo/margen

## Hecho (sesiones anteriores)

- POS: topbar → `☰` + drawer lateral; gestión de productos en el drawer (ADMIN + SUPERVISOR); cards limpias.
- Backend `usuarios`/`sucursales`: `?incluir_inactivas`, `POST /{id}/reactivar`.
- Tema: `theme.css` (tokens), `App.css` + `Admin.css` reescritos, `ThemeContext` + `ThemeToggle`.
- Backend: `"Invalid credentials"` → `"Usuario o contraseña incorrectos"`.
