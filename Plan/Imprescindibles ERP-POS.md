---
tipo: plan
estado: en progreso
actualizado: 2026-08-31
---

# Imprescindibles ERP-POS

Relacionado: [[Roadmap]] · [[00 - Índice]] · [[Modelo de datos]]

Lo mínimo para que Byeburger sea un POS usable en el local. La mayoría de las
tablas **ya existen** en la DB — falta API + UI.

## A · Caja y turnos  ← BACKEND + POS HECHO (falta módulo admin)

Hoy `id_turno = 1` hardcodeado. Tablas: `cajas`, `turnos_caja` (monto_inicial,
fecha_apertura/cierre, efectivo_contado/esperado, diferencia, estado), `movimientos_caja`.

- Abrir turno (elegir caja + monto inicial).
- Registrar movimientos de caja: `RETIRO`, `INGRESO`, `GASTO`.
- Cerrar turno con **arqueo**: contar efectivo → efectivo esperado (inicial + ventas efectivo + ingresos − retiros − gastos) → diferencia.
- **Corte Z**: totales del turno por medio de pago, cantidad de pedidos.
- ✅ POS: sin turno abierto → pantalla "Caja cerrada" con "Abrir caja". Drawer: turno actual + Movimiento + Cerrar caja (arqueo con diferencia).
- ✅ `crear_pedido` exige turno abierto (409 si no), usa el `id_turno` real, `estado='ENTREGADO'`. Anular → `estado='CANCELADO'`.
- ✅ Backend `routers/cajas.py` prefix `/caja`: cajas, turno-actual, POST turnos, movimientos, cerrar, corte, GET turnos.
- ⏳ Admin → módulo **Caja**: historial de turnos + ver corte Z.

> Estados válidos en la DB (check constraints): pedido = PENDIENTE/PREPARANDO/LISTO/EN_REPARTO/ENTREGADO/CANCELADO · turno = ABIERTO/CERRADO · mov_caja = INGRESO/RETIRO/GASTO/AJUSTE.

## B · Pedidos post-venta  ← HECHO

`GET /pedidos/` existe (devuelve todo). Falta:

- Filtros: turno / fecha / estado.
- Detalle de pedido (ya existe `GET /pedidos/{id}`).
- **Anular** pedido (`estado = ANULADO`, revierte el pago del turno; F2+: repone stock).
- Estados simples: `PENDIENTE` → `ENTREGADO` / `ANULADO`.
- ✅ UI: módulo **Pedidos** (Operación) — lista del día + filtro estado, detalle, anular.
- ✅ Módulo **Turnos de caja** (Operación) — historial + Corte Z.
- ✅ Quick win: sesión persistida en `localStorage` + validación con `/usuarios/me` al recargar (`restaurando` en AuthContext). Ya no desloguea al recargar.

## C · Categorías (CRUD)  ← HECHO

✅ `POST/PUT/DELETE/reactivar /categorias/` (borrado suave) + `GET /categorias/uso` (# productos por categoría) + módulo admin **Categorías** (grupo Catálogo).

## D · Modificadores / adicionales  ← HECHO

Tablas: `modificadores` (nombre, tipo, precio_adicional), `producto_modificadores`,
`detalle_pedido_modificadores`.

- Admin: CRUD de modificadores + asociarlos a productos.
- POS: al tocar un producto, si tiene modificadores → mini-selector antes de sumar al carrito.
- El ítem del carrito lleva sus modificadores; el precio de línea los suma.
- ✅ El pedido persiste los modificadores por línea (tabla nueva `pedido_item_modificadores`, migración `0004`).
- ✅ `routers/modificadores.py`: CRUD + `GET /asociaciones` ({id_producto:[id_mod]}) + `PUT /producto/{id}` (set asignación).
- ✅ `crear_pedido` acepta `modificadores:[id]` por ítem, suma `precio_adicional × cantidad`, persiste. Detalle de pedido devuelve mods por ítem.
- ✅ Admin `ModificadoresPage` (grupo Catálogo): CRUD + asignar a productos (lista + checkboxes).
- ✅ POS: al tocar un producto con modificadores → `ModificadorSelector` (checkboxes); la línea del carrito lleva sus mods (con `lineId` único; mismo producto+mods se agrupa, distintos = líneas separadas), el precio y totales los suman. El cobro envía `modificadores:[id]` por ítem.

## E · Impresión  ← HECHO

- **Ticket** (boleta interna) 80 mm: cabecera local, ítems, totales, pago, vuelto. `window.print()` + CSS `@media print`.
- **Comanda de cocina**: solo ítems + modificadores + observación, sin precios.
- ✅ `components/print/ImpresionPedido.tsx` (portal a body) + `print.css` (`@media print` oculta `#root`, muestra `.impresion-portal`).
- ✅ POS: tras cobrar → panel "Pedido #X cobrado" con botones Comanda / Ticket → `window.print()`.
- ✅ Admin → Pedidos → detalle: Comanda / Ticket (re-imprimir).
- Ticket 80mm monoespaciado: cabecera local, ítems+mods+precios, subtotal/total, pago+vuelto, obs. Comanda: texto grande, sin precios.

> **Boleta electrónica (SII)**: fuera de alcance por ahora — necesita un proveedor
> (LibreDTE / Bsale / Nubox…) y credenciales. Tarea aparte cuando el usuario elija proveedor.

## F · Dashboard / reportes  ← HECHO

`estadisticas.py` está vacío. Módulo admin **Dashboard**:

- Ventas del día / rango, por medio de pago, por sucursal.
- **Ganancia bruta** = Σ (precio vendido − costo receta). Los datos ya están.
- Ticket promedio, cantidad de pedidos.
- ✅ Top productos vendidos.
- ✅ Backend `GET /estadisticas/dashboard?desde&hasta` (resumen + por_metodo + por_tipo + por_dia + top_productos + ganancia bruta = ventas − Σ costo receta). Frontend `DashboardPage` (grupo Operación, default): tiles Ventas/Pedidos/Ticket prom/Ganancia, gráfico de barras CSS por día, tablas por método/tipo/top. Presets Hoy / 7 días / Este mes / Personalizado.

## Orden

A (caja) → B (pedidos) → C (categorías) → D (modificadores) → E (impresión) → F (dashboard).
