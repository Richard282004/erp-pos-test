---
tipo: referencia
---

# Glosario

Relacionado: [[00 - Índice]] · [[04 - Inventario]]

| Término | Significado |
|---|---|
| **Insumo** | Materia prima que se compra y se consume (carne, pan, vasos). Ver [[Insumos]]. |
| **Unidad base** | La unidad chica en que se guarda un insumo: g, ml, u. La compra se convierte a ella. |
| **Receta / BOM** | Lista de insumos + cantidades para armar 1 unidad de un producto. Ver [[Recetas]]. |
| **Costo** | Suma del costo de los insumos de la receta. No incluye mano de obra ni gastos fijos (por ahora). |
| **Costo promedio ponderado** | Costo unitario del insumo, recalculado en cada compra mezclando stock viejo y nuevo. Ver [[Costeo promedio ponderado]]. |
| **Movimiento** | Todo cambio de stock de un insumo (COMPRA / CONSUMO / MERMA / AJUSTE). Ver [[Movimientos de inventario]]. |
| **CONSUMO** | Salida de stock por venta, calculada desde la receta. |
| **Merma** | Insumo perdido que no se vendió (quemado, vencido, error). Ver [[Mermas]]. |
| **Ajuste** | Movimiento que corrige el stock del sistema contra un conteo físico real. |
| **Stock teórico** | Lo que el sistema cree que hay (según movimientos). |
| **Conteo físico** | Contar a mano lo que hay de verdad, para comparar con el teórico. |
| **Ganancia** | `precio − costo`. |
| **Margen %** | `(precio − costo) / precio`. Sobre el **precio**. |
| **Markup %** | `(precio − costo) / costo`. Sobre el **costo**. |
| **Precio sugerido** | `costo / (1 − margen_objetivo)`. |
| **Valorización de inventario** | `Σ stock_actual × costo_promedio` de todos los insumos. |
| **Borrado suave** | Marcar `activo = FALSE` en vez de borrar la fila. Ver [[Decisiones]]. |
