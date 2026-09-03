---
tipo: plan
area: inventario
---

# Fases inventario

Relacionado: [[04 - Inventario]] · [[Roadmap]] · [[Modelo de datos]] · [[Administración (estructura)]]

## F1 — Costo, margen y stock manual  ← EN CURSO

Alcance confirmado:

- Migración Alembic `0003`: `insumos`, `producto_insumos`, `compras`, `compra_items`, `movimientos_inventario`.
- Sidebar de admin reorganizado en grupos (**Recursos** / **Inventario**). Ver [[Administración (estructura)]].
- **Insumos**: CRUD + borrado suave + reactivar. Stock en rojo si `< stock_minimo`.
- **Compras**: registrar compra (varias líneas: insumo + cantidad + unidad + costo total) → sube stock, genera movimientos `COMPRA`, recalcula [[Costeo promedio ponderado|costo promedio]]. Historial de compras.
- **Ajuste / Merma** manuales: movimiento `AJUSTE` (±) o `MERMA` (−).
- **Recetas**: por producto, agregar insumos + cantidad. Muestra costo / margen / precio sugerido ([[Cálculo de precios y ganancias]]).
- Unidad base chica + conversión al comprar (`kg→g`, `L→ml`).
- **Resultado:** sabés cuánto cuesta y ganás cada producto, y cuánto vale tu inventario.

Fuera de F1: el descuento de stock al vender (eso es F2).

## F2 — Descuento automático + alertas

- Al cobrar pedido → movimientos [[Movimientos de inventario|CONSUMO]] por receta.
- `stock_actual` baja solo con las ventas.
- Alertas de stock bajo (`< stock_minimo`) en el módulo y en el drawer del POS.

## F3 — Mermas + conteo físico

- Flujo de [[Mermas|merma]] con motivo.
- Conteo físico → `AJUSTE` con la diferencia, etiquetada.
- Reporte de pérdidas por merma / error.

## F4 — Reportes + proveedores

- Ganancia por día / producto / categoría.
- Valorización de inventario, historial de movimientos.
- Tabla `proveedores`, ligada a `compras` (hoy `compras.proveedor` es texto libre).
- Productos con margen bajo.

## Decisiones (cerradas)

Ver [[Decisiones]]: unidad base chica + conversión · descuento de stock en F2 · proveedores en F4.
