# Manual de uso — POS Mini ERP

Guía para cajeros, supervisores y administradores. Explica el uso diario del
sistema: abrir caja, vender, cobrar, imprimir, cerrar caja y usar el panel de
administración.

> Si algo no coincide con lo que aparece en pantalla, avisa: el proyecto se
> actualiza seguido y este manual se corrige junto con él.

---

## 1. Conceptos básicos

| Término | Qué es |
|---|---|
| **Turno de caja** | El período entre que se abre la caja y se cierra. Todas las ventas, retiros e ingresos quedan agrupados en el turno. |
| **Venta / folio** | Cada cobro genera una venta con un número (folio) que **vuelve a partir de 1 cada vez que se abre un turno nuevo**. En el comprobante aparece como "Venta 5". |
| **Arqueo** | El conteo del efectivo real de la caja comparado con lo que el sistema esperaba. Se hace al cerrar el turno. |
| **Corte Z** | El resumen impreso de un turno cerrado: ventas por medio de pago, efectivo, movimientos y anulaciones. El **Corte X** es el mismo resumen, pero de un turno todavía abierto. |

### Roles

| Rol | Qué puede hacer |
|---|---|
| **Cajero** | Operar el punto de venta: abrir y cerrar su caja, vender, cobrar, imprimir y registrar movimientos. Ve solo sus propias ventas. |
| **Supervisor** | Todo lo del cajero, más el panel de administración (catálogo, insumos, reportes), autorizar descuentos y anular ventas. No accede a Usuarios, Sucursales, Cajas, Datos del negocio, Auditoría ni Mantenimiento. |
| **Administrador** | Acceso total. |
| **Reportes** | Solo lectura: Dashboard, Pedidos y Turnos. No opera la caja ni edita nada. Sirve para un contador o para un dueño que solo necesita revisar los números. |

---

## 2. Iniciar sesión

1. Abre la dirección del sistema en el navegador (de preferencia Chrome, en una
   tablet o notebook).
2. Escribe tu **usuario** y **contraseña** y presiona **Entrar**.
3. La primera entrada del día puede demorar hasta un minuto ("Despertando el
   servidor…"). Es normal con el plan actual: no cierres la página.

**La sesión se renueva sola** mientras uses el sistema. Si queda mucho rato sin
actividad, se cierra por seguridad y hay que iniciar sesión de nuevo.

---

## 3. Abrir la caja (turno)

No se puede vender sin un turno abierto.

1. Al entrar, si no hay un turno abierto, aparece la pantalla **Abrir caja**.
2. Elige la **caja** (si hay más de una en la sucursal).
3. Ingresa el **monto inicial**: el dinero con que parte el cajón (el "fondo").
4. Presiona **Abrir**.

> Cada caja admite un solo turno abierto a la vez, y cada persona un solo
> turno. Si otra persona ya abrió esa caja, el sistema no lo permite.

---

## 4. Vender

### 4.1 Armar el pedido

1. Elige la **categoría** en la parte superior y toca los productos para
   agregarlos.
2. Al agregar un producto se puede ajustar la **cantidad** con los botones
   `− N +` y elegir **modificadores** (por ejemplo "sin cebolla", "extra
   queso"); los que suman precio lo indican.
3. Elige el **tipo de pedido**: Para servir aquí / Para llevar / Delivery.
4. El **carrito** (a la derecha, o en el botón "Ver pedido") muestra el detalle
   y el total.

### 4.2 Descuentos

- Se puede aplicar un **porcentaje de descuento** al pedido.
- Cada cajero tiene un **tope** de descuento. Si el descuento supera ese tope,
  el sistema pide la **autorización de un supervisor o administrador**: esa
  persona ingresa su usuario y contraseña en el aviso que aparece.
- La autorización sirve **una sola vez y para ese pedido**. Si después se
  cambia el monto o el descuento, hay que pedirla de nuevo.
- Un descuento del **100%** deja el total en $0: la venta se registra, pero no
  hay cobro.

---

## 5. Cobrar

1. En el carrito, elige el **medio de pago**: Efectivo, Débito, Crédito o
   Transferencia.
2. **Si es efectivo**, ingresa el **monto recibido**. Debe ser igual o mayor
   que el total; el sistema calcula el **vuelto**.
3. Presiona **Cobrar**.
4. Aparece la confirmación **"Venta N cobrada"** con los botones de impresión.

> Si justo se corta internet, el sistema reintenta el cobro una sola vez. Si
> aparece un aviso de conexión, espera unos segundos y vuelve a intentar: **no
> se cobra dos veces** aunque se presione el botón de nuevo (cada cobro lleva
> una marca única).

---

## 6. Imprimir

Después de cobrar (o desde **Pedidos**, en el panel):

- **Comprobante (ticket)**: el documento para el cliente, con el detalle, el
  desglose de IVA, el total y el vuelto.
- **Comanda**: la copia para la cocina, con letra grande y sin precios.

La impresión usa el cuadro de impresión del navegador. Para que salga bien en
una impresora térmica de 80 mm, conviene dejarla como impresora predeterminada
y, si el navegador lo permite, activar la impresión sin cuadro de diálogo.

El **logo del comprobante** se configura en el panel (ver 9.7).

---

## 7. Movimientos de caja

Durante el turno se puede registrar dinero que entra o sale del cajón fuera de
las ventas. En el panel de la caja abierta, presiona **Movimiento**:

| Tipo | Cuándo se usa |
|---|---|
| **Ingreso** | Entra dinero a la caja (por ejemplo, sencillo que se trae). |
| **Retiro** | Sale dinero de la caja (por ejemplo, se lleva a la caja fuerte). |
| **Gasto** | Pago hecho con dinero de la caja (por ejemplo, a un proveedor). |

Siempre indica un **motivo**. Estos movimientos afectan el efectivo esperado
del arqueo.

---

## 8. Cerrar la caja

Al final del turno:

1. En el panel de la caja abierta, presiona **Cerrar caja**.
2. El sistema muestra el **arqueo esperado**: monto inicial + ventas en
   efectivo + ingresos − retiros − gastos − devoluciones.
3. Cuenta el dinero real del cajón e ingresa el **efectivo contado**.
4. Presiona **Cerrar caja**. El sistema muestra la **diferencia** (sobrante o
   faltante).
5. Presiona **Imprimir corte Z** para guardar el comprobante del turno.

Un turno cerrado no se puede reabrir. El corte Z queda disponible después en
**Panel → Turnos de caja**.

---

## 9. Panel de administración

Se entra desde **Administración** (o la dirección `/admin`). Lo que se ve
depende del rol.

### 9.1 Dashboard

Ventas del período, ventas por día y productos más vendidos. Incluye botones
para **exportar a CSV** (se abre en Excel; usa `;` como separador y trae la
codificación necesaria para las tildes).

### 9.2 Pedidos

Lista de ventas con su detalle. Desde aquí se puede:

- **Ver** el detalle de una venta y volver a imprimir el comprobante o la
  comanda.
- **Anular** una venta (supervisor o administrador — ver 9.3).

### 9.3 Anular una venta

1. Abre la venta en **Pedidos → Ver**.
2. Presiona **Anular pedido**.
3. Escribe el **motivo** (obligatorio).
4. Marca si **se devolvió el dinero al cliente**. **Con devolución**: fue una
   venta real que se revierte; sigue contando como ingreso y la devolución se
   descuenta del efectivo del turno (queda como movimiento `DEVOLUCION`); solo
   aplica si se pagó en efectivo con el turno todavía abierto. **Sin
   devolución**: fue un error de registro y la venta sale de todos los totales,
   como si no hubiera existido.

Todo queda en el **Corte Z** (línea "Devoluciones" y sección "Anuladas") y en
**Auditoría**.

### 9.4 Turnos de caja

Historial de todos los turnos. El botón **Corte Z** abre el resumen de
cualquier turno y permite imprimirlo.

### 9.5 Catálogo

- **Categorías**: los grupos de productos que se ven en el punto de venta.
- **Modificadores**: opciones que se agregan a un producto (con o sin precio).
  Se asignan a los productos con el buscador y el filtro por categoría; al
  tocar un producto se abre la lista para marcar los modificadores que le
  aplican.
- **Recetas**: qué insumos consume cada producto y en qué cantidad. Mismo
  flujo: se busca el producto y se abre el editor de la receta.

> El descuento automático de stock por venta todavía no está activo: por ahora
> las recetas sirven para calcular costos.

### 9.6 Inventario

- **Insumos**: la lista de insumos con su unidad y su stock.
- **Compras**: se registra una compra a proveedor y suma stock.

### 9.7 Recursos (solo administrador)

- **Usuarios y roles**: crear y editar usuarios, asignar rol y sucursal,
  cambiar la contraseña, activar o desactivar.
- **Sucursales** y **Cajas**: la estructura del local.
- **Datos del negocio**: nombre, razón social, RUT, contacto y el mensaje del
  comprobante. Aquí también se sube el **logo del comprobante** (admite PNG con
  transparencia, con un interruptor para mostrarlo o no) y se configura la
  **pantalla de inicio de sesión** (título, subtítulo, logo y color de acento,
  con vista previa).
- **Auditoría**: registro de acciones sensibles (anulaciones, descuentos,
  cambios de usuarios, entre otras).
- **Mantenimiento**: herramientas de limpieza. Está desactivado por seguridad,
  salvo que se habilite de forma expresa en el servidor.

---

## 10. Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| "Despertando el servidor…" al entrar | Es normal en la primera entrada del día. Espera hasta un minuto. |
| Aviso de conexión al cobrar | Espera unos segundos y vuelve a intentar. El cobro no se duplica. |
| "La sesión venció" | Inicia sesión de nuevo. Las ventas ya cobradas no se pierden. |
| Pide autorización al aplicar un descuento | El descuento supera el tope del rol: un supervisor o administrador debe autorizar en ese aviso. |
| No se puede abrir la caja | Ya hay un turno abierto en esa caja (o uno propio en otra), o la caja es de otra sucursal. |
| El comprobante sale chico o cortado | Deja la impresora térmica de 80 mm como predeterminada y revisa el tamaño de papel en el cuadro de impresión. |
| Con rol "Reportes" no aparece el punto de venta | Es correcto: ese rol solo ve Dashboard, Pedidos y Turnos. |

---

## 11. Buenas prácticas

- Abre la caja con el fondo real y ciérrala contando el dinero: el arqueo solo
  sirve si los números son de verdad.
- Escribe motivos claros en movimientos y anulaciones. Ayudan mucho al momento
  de cuadrar la caja.
- Imprime y guarda el Corte Z de cada turno.
- No compartas tu usuario. Si alguien necesita autorizar un descuento, que use
  el suyo en el aviso.
