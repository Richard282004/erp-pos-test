---
tipo: referencia
actualizado: 2026-08-31
---

# Modelo de datos

Relacionado: [[04 - Inventario]] · [[Insumos]] · [[Recetas]] · [[Movimientos de inventario]]

## Tablas actuales (Postgres)

- `empresas`, `sucursales`, `usuarios`, `roles`
- `categorias`, `productos`, `modificadores`, `producto_modificadores`
- `pedidos`, `pedido_items`, `detalle_pedido`, `pagos`
- `cajas`, `turnos_caja`, `movimientos_caja` (parcial, `id_turno = 1` hardcodeado)
- Alembic va en `0002_create_roles_table` (head limpio).

`productos`: `id_producto, id_categoria, nombre, descripcion, precio, imagen_url, activo, fecha_creacion`. **No tiene `costo`** — se calcula desde [[Recetas]].

## Tablas nuevas — migración Alembic `0003_create_inventario`

```sql
insumos (
  id_insumo        serial pk,
  nombre           text not null,
  unidad           text not null,                 -- 'g' | 'ml' | 'u'  (unidad base)
  stock_actual     numeric not null default 0,    -- en unidad base (cache de movimientos)
  stock_minimo     numeric not null default 0,
  costo_promedio   numeric not null default 0,    -- $ por unidad base
  activo           boolean not null default true,
  fecha_creacion   timestamptz not null default now()
)

producto_insumos (                                -- la receta / BOM
  id               serial pk,
  id_producto      int not null references productos(id_producto),
  id_insumo        int not null references insumos(id_insumo),
  cantidad         numeric not null,              -- en unidad base del insumo
  unique (id_producto, id_insumo)
)

compras (
  id_compra        serial pk,
  fecha            timestamptz not null default now(),
  id_usuario       int references usuarios(id_usuario),
  proveedor        text,                          -- texto libre (proveedores reales -> F4)
  nota             text,
  total            numeric not null default 0
)

compra_items (
  id               serial pk,
  id_compra        int not null references compras(id_compra),
  id_insumo        int not null references insumos(id_insumo),
  cantidad_compra  numeric not null,              -- como se compró (ej 1)
  unidad_compra    text not null,                 -- 'kg' | 'g' | 'L' | 'ml' | 'u'
  cantidad_base    numeric not null,              -- convertida a unidad base (ej 1000 g)
  costo_total      numeric not null               -- $ de esa linea
  -- costo_unitario_base = costo_total / cantidad_base
)

movimientos_inventario (
  id_movimiento    serial pk,
  id_insumo        int not null references insumos(id_insumo),
  tipo             text not null,                 -- COMPRA | CONSUMO | MERMA | AJUSTE
  cantidad         numeric not null,              -- + entra / - sale (unidad base)
  costo_unitario   numeric not null,              -- $ por unidad base en ese momento
  fecha            timestamptz not null default now(),
  id_usuario       int references usuarios(id_usuario),
  id_compra        int references compras(id_compra),
  id_pedido        int references pedidos(id_pedido),  -- solo CONSUMO (F2)
  nota             text
)
```

Conversión de unidades (al registrar compra): `kg↔g ×1000`, `L↔ml ×1000`, `u` sin conversión.


## Reglas de integridad

- `insumos.stock_actual` = Σ `movimientos_inventario.cantidad` del insumo. La columna es cache; la verdad son los movimientos.
- Borrado suave en `insumos` (igual que `productos`, `usuarios`, `sucursales`).
- `movimientos_inventario` nunca se borra ni edita — se corrige con otro movimiento.

## Costo promedio ponderado (al registrar una COMPRA)

```
nuevo_costo = (stock_actual × costo_promedio  +  cantidad_base × costo_unitario_compra)
              ÷ (stock_actual + cantidad_base)
```
Se hace en el backend dentro de la misma transacción que inserta la compra y los movimientos. Ver [[Costeo promedio ponderado]].

## Cálculos derivados (no se guardan)

- `costo_producto` = Σ (`producto_insumos.cantidad` × `insumos.costo_promedio`). Ver [[Cálculo de precios y ganancias]].
- Ganancia de pedido = Σ ítems (`precio` − costo guardado en el `CONSUMO`) — F2+.
