---
tipo: concepto
area: inventario
---

# Costeo promedio ponderado

Relacionado: [[04 - Inventario]] · [[Insumos]] · [[Movimientos de inventario]] · [[Cálculo de precios y ganancias]]

## Problema

Hoy compras carne a **$3.000/kg**. El mes que viene a **$3.500/kg**. ¿Qué costo usa la [[Recetas|receta]] de la hamburguesa?

## Solución: promedio ponderado

Cada [[Movimientos de inventario|COMPRA]] recalcula el `costo_promedio` del [[Insumos|insumo]] mezclando lo viejo con lo nuevo:

```
nuevo_costo_promedio =
  (stock_actual × costo_promedio_actual  +  cantidad_comprada × costo_compra)
  ÷ (stock_actual + cantidad_comprada)
```

### Ejemplo

- Tienes 500 g a $3/g → valor $1.500
- Compras 1000 g a $3,5/g → valor $3.500
- Ahora: 1500 g valen $5.000 → **costo_promedio = $3,33/g**

La próxima hamburguesa costea la carne a $3,33/g sin que tengas que tocar nada.

## Por qué este método

- Estándar en gastronomía y retail.
- Simple: un solo número por insumo.
- No necesita rastrear lotes (FIFO) — más trabajo, no aporta a este negocio.

## `CONSUMO`, `MERMA`, `AJUSTE`

Usan el `costo_promedio` vigente al momento del movimiento. No lo modifican (salvo `AJUSTE` de valor explícito).
