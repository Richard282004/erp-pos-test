---
tipo: concepto
area: inventario
---

# Mermas

Relacionado: [[04 - Inventario]] · [[Movimientos de inventario]] · [[Insumos]]

## Qué es

**Merma** = insumo que se pierde y **no** se transformó en una venta:

- carne quemada en la plancha
- pan que se cae al piso
- producto vencido / en mal estado
- error de cocina (armó mal, se rehace)
- robo / pérdida

## Cómo se registra

Movimiento tipo `MERMA` en [[Movimientos de inventario]]: baja el stock del [[Insumos|insumo]], no genera ingreso.

Sirve para dos cosas:
1. **Medir la pérdida en $**: `cantidad × costo_promedio`. Reporte "pérdidas por merma" por día/semana.
2. **Mantener el stock del sistema igual al real**: si no registras la merma, el sistema "cree" que tienes más carne de la que hay.

## Teórico vs real

- El [[Movimientos de inventario|CONSUMO automático]] descuenta lo que *debería* gastar la receta (teórico).
- La cocina real gasta un poco más (porciones desparejas, pruebas, mermas chicas).
- Por eso: **merma grande → se registra al toque**; **merma chica acumulada → se detecta con el conteo físico** y se corrige con `AJUSTE`.

## Conteo físico (F3)

1. Cada semana cuentas físicamente cada insumo.
2. Sistema compara: `stock_teórico` vs `conteo_real`.
3. La diferencia se registra como `AJUSTE` y se etiqueta como merma/error.
4. Reporte: cuánto se pierde por mes, en qué insumos.
