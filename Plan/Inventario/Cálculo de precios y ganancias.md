---
tipo: concepto
area: inventario
---

# Cálculo de precios y ganancias

Relacionado: [[04 - Inventario]] · [[Recetas]] · [[Costeo promedio ponderado]] · [[Fases inventario]]

## Fórmulas

Con `costo` = costo de la [[Recetas|receta]] y `precio` = precio de venta:

| Métrica | Fórmula | Ejemplo (costo $725, precio $2.000) |
|---|---|---|
| Ganancia $ | `precio − costo` | $1.275 |
| Margen % | `(precio − costo) / precio` | 63,7% |
| Markup % | `(precio − costo) / costo` | 175,9% |
| Precio sugerido | `costo / (1 − margen_objetivo)` | margen 65% → $2.071 |

> Margen y markup **no son lo mismo**. Margen es sobre el precio, markup sobre el costo. El módulo muestra margen %.

## En el modal de producto (F1)

Debajo de la [[Recetas|receta]]:

```
Costo:            $725
Precio de venta:  $2.000   [editable]
Ganancia:         $1.275
Margen:           63,7%
Precio sugerido:  $2.071   (margen objetivo 65%)  [aplicar]
```

`margen_objetivo` configurable (global, o por categoría más adelante).

## Reportes (F4)

- **Ganancia por pedido** = Σ ítems `(precio_vendido − costo_al_momento)`. El costo se guarda en el movimiento [[Movimientos de inventario|CONSUMO]], así el reporte histórico no cambia si después sube la carne.
- **Ganancia por día / por producto / por categoría.**
- **Valorización de inventario** = Σ insumos `stock_actual × costo_promedio`.
- **Pérdida por [[Mermas|merma]]** por período.
- **Productos con margen bajo** (< X%).

## Nota sobre descuentos

El POS ya aplica descuento por ítem y por pedido. La ganancia real usa el **precio efectivamente cobrado**, no el de lista.
