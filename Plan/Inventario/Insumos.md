---
tipo: concepto
area: inventario
---

# Insumos

Relacionado: [[04 - Inventario]] · [[Recetas]] · [[Movimientos de inventario]] · [[Costeo promedio ponderado]]

## Qué es

Un **insumo** es materia prima que compras y que se consume al armar productos: carne, pan, queso, salsas, papas, vasos, servilletas.

## Campos

| Campo | Ejemplo | Nota |
|---|---|---|
| `nombre` | Carne molida | |
| `unidad` | `g` | unidad base, siempre la chica: g, ml, u |
| `stock_actual` | 1000 | en unidad base |
| `stock_minimo` | 2000 | dispara alerta visual |
| `costo_promedio` | 3.0 | $ por unidad base. Ver [[Costeo promedio ponderado]] |
| `activo` | true | borrado suave, igual que [[Decisiones|productos]] |

## Unidad base + conversión al comprar

La carne la compras en **kg** pero la receta usa **g**. Regla:

- El insumo se guarda siempre en la unidad chica (`g`).
- Al [[Movimientos de inventario|registrar compra]] eliges "kg" y el sistema multiplica ×1000.
- Conversiones soportadas: kg↔g, L↔ml, u.

> Pendiente confirmar en [[Preguntas abiertas]].

## Stock actual

`stock_actual` **no se edita a mano**. Es la suma de todos los [[Movimientos de inventario]] del insumo. Para corregir contra la realidad se usa un movimiento `AJUSTE`.

## Alertas

Si `stock_actual < stock_minimo` → fila roja en el módulo Inventario y en [[Cálculo de precios y ganancias|reportes]].
