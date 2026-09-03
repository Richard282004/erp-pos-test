---
tipo: concepto
area: inventario
---

# Recetas

Relacionado: [[04 - Inventario]] · [[Insumos]] · [[Cálculo de precios y ganancias]] · [[Modelo de datos]]

## Qué es

La **receta** (o BOM, "bill of materials") dice cuánto de cada [[Insumos|insumo]] lleva **una unidad** de un producto.

Tabla `producto_insumos`: `id_producto`, `id_insumo`, `cantidad` (en la unidad base del insumo).

## Ejemplo — Hamburguesa X

| Insumo | Cantidad | Costo unit. | Costo línea |
|---|---|---|---|
| Carne molida | 125 g | $3/g | $375 |
| Pan | 1 u | $200/u | $200 |
| Queso | 20 g | $7,5/g | $150 |
| **Costo receta** | | | **$725** |

## Costo del producto

```
costo_producto = Σ ( producto_insumos.cantidad × insumo.costo_promedio )
```

No se guarda duplicado en `productos`. Se calcula:
- en el backend al devolver el producto (`costo` en la respuesta),
- en vivo en el frontend mientras editas la receta.

## UI

Sección "Receta" dentro del modal de producto (`AddProductModal`):
- Lista de insumos de la receta con su cantidad, editable.
- Botón "+ Agregar insumo" (selector de insumo + cantidad).
- Pie: **Costo total: $725** · usa [[Cálculo de precios y ganancias]] para mostrar margen y precio sugerido.

## Productos sin receta

Si un producto no tiene receta cargada → `costo = 0`, margen = 100%, y aviso "sin receta". No bloquea la venta.
