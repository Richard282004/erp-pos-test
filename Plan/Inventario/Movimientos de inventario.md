---
tipo: concepto
area: inventario
---

# Movimientos de inventario

Relacionado: [[04 - Inventario]] · [[Insumos]] · [[Mermas]] · [[Costeo promedio ponderado]]

## Qué es

El **libro mayor** del stock. Todo cambio en la cantidad de un [[Insumos|insumo]] es un movimiento. El `stock_actual` de un insumo = suma de sus movimientos. Nada modifica el stock por fuera de acá → todo queda auditado.

## Tipos

| Tipo | Cuándo | Efecto stock | Efecto $ / costo |
|---|---|---|---|
| `COMPRA` | compras 1 kg de carne | +1000 g | recalcula [[Costeo promedio ponderado\|costo promedio]] |
| `CONSUMO` | se vende un pedido | −(receta × cantidad vendida) | costo de venta del pedido |
| `MERMA` | se quemó / venció / se cayó | −cantidad | pérdida (ver [[Mermas]]) |
| `AJUSTE` | conteo físico corrige diferencia | ± cantidad | corrección de valor |

## Campos

`id`, `id_insumo`, `tipo`, `cantidad` (+ entra, − sale, o signo por tipo), `costo_unitario` (el de ese movimiento), `fecha`, `id_usuario`, `nota`, `id_pedido` (solo en `CONSUMO`).

## CONSUMO automático al cobrar

Al crear un pedido (`POST /pedidos/`), por cada ítem:
- buscar la [[Recetas|receta]] del producto,
- por cada insumo de la receta: generar movimiento `CONSUMO` de `cantidad_receta × cantidad_vendida`,
- descontar del stock,
- si algún insumo queda bajo mínimo → marcar alerta (no bloquear la venta).

> ¿Desde qué fase? Ver [[Fases inventario]] y [[Preguntas abiertas]].

## Compras (opcional, F1)

Para registrar reposición cómoda: tablas `compras` (cabecera: fecha, proveedor, total) + `compra_items` (insumo, cantidad, costo). Cada `compra_item` genera un movimiento `COMPRA`.
