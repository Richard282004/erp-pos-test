---
tipo: tarea
estado: en progreso
prioridad: 4
---

# 04 — Inventario

Relacionado: [[Roadmap]] · [[Modelo de datos]] · [[Fases inventario]] · [[Administración (estructura)]]

Hub del sistema de inventario y costos. Sub-notas:

- [[Insumos]] — materia prima que se compra
- [[Recetas]] — qué insumos lleva cada producto (BOM)
- [[Movimientos de inventario]] — libro mayor de stock
- [[Mermas]] — pérdidas que no se vendieron
- [[Costeo promedio ponderado]] — cómo se calcula el costo unitario
- [[Cálculo de precios y ganancias]] — margen, precio sugerido, ganancia
- [[Fases inventario]] — F1 a F4 (F1 en curso)

## Idea en una frase

Dos niveles: **insumos** (lo que compras, con costo por unidad) y **recetas** (cuánto de cada insumo lleva un producto). El costo de un producto = suma de sus insumos. La ganancia = precio − costo. El stock baja con las ventas ([[Movimientos de inventario|CONSUMO]]) y las [[Mermas]], y sube con las compras.

## Ejemplo guía (se usa en todo el vault)

- Carne molida: compras 1 kg (1000 g) por **$3.000** → **$3/g**
- Hamburguesa X (receta): 125 g carne + 1 pan + 20 g queso
- Costo = 125×3 + 200 + 20×7,5 = **$725**
- Precio venta = **$2.000** → ganancia **$1.275** → margen **63,7%**

## F1 — plan de implementación

Sidebar de admin en grupos ([[Administración (estructura)]]):
```
Recursos    → Usuarios y roles · Sucursales
Inventario  → Insumos · Compras · Recetas
```

### Backend nuevo

- `routers/insumos.py` — CRUD + borrado suave + `POST /{id}/reactivar`.
- `routers/inventario.py`:
  - `POST /inventario/compras` — crea compra + items + movimientos `COMPRA`, convierte unidades, sube stock, recalcula `costo_promedio` (una transacción).
  - `GET /inventario/compras` — historial.
  - `POST /inventario/movimientos` — `AJUSTE` / `MERMA` manual.
  - `GET /inventario/movimientos?id_insumo=`.
  - `GET /inventario/alertas` — insumos bajo mínimo.
- `routers/productos.py` — `GET/PUT /productos/{id}/receta`; `costo` calculado en las respuestas de producto.
- RBAC: ADMIN + SUPERVISOR.
- Migración `0003_create_inventario` — tablas de [[Modelo de datos]].

### Frontend nuevo

- `api/insumos.ts`, `api/inventario.ts`, receta + costo en `api/productos.ts`.
- `pages/admin/InsumosPage.tsx` — tabla insumos, form alta, editar/eliminar/reactivar, "Registrar compra", "Ajuste/Merma".
- `pages/admin/ComprasPage.tsx` — form de compra multi-línea + historial.
- `pages/admin/RecetasPage.tsx` — lista de productos → editar receta → panel costo/margen/precio sugerido.
- `adminModules.tsx` → grupos · `AdminLayout.tsx` → encabezados · `App.tsx` → rutas.

### Orden

1. ✅ Reorg sidebar en grupos.
2. ✅ Migración `0003` aplicada.
3. ✅ Backend `insumos.py` + `inventario.py` (compras, movimientos ajuste/merma, alertas). Costo promedio ponderado. Conversión kg→g / L→ml.
4. ✅ Frontend `InsumosPage` (tabla + alta + editar/eliminar/reactivar + ajuste/merma, stock en rojo si bajo mínimo) + `ComprasPage` (compra multi-línea + historial).
5. ✅ Backend `GET /productos/costos`, `GET/PUT /productos/{id}/receta`.
6. ✅ Frontend `RecetasPage`: lista de productos con costo/margen + editor de receta con costo / ganancia / margen / precio sugerido en vivo.

**F1 COMPLETA.** Datos de prueba: insumos "Carne molida" (g) + "Pan de hamburguesa" (u); Bacon Burger con receta (150g carne + 1 pan).

Pendiente menor (F1.1 / futuro): mostrar costo/margen dentro del modal de producto del POS al fijar el precio.

## Futuro (F2–F4)

- **Reportes**: ganancia por día/producto, stock bajo, historial.
- **Receta en el modal de producto**: mostrar costo/margen al fijar el precio (link a Recetas).
- Descontar stock al vender (F2), mermas y conteo físico (F3).
