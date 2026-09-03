export function ResumenPedido({
  subtotalSinDescuentos,
  descuentoProductos,
  subtotal,
  descuento,
  montoDescuento,
  total,
  formatoPrecio,
}: {
  subtotalSinDescuentos: number;
  descuentoProductos: number;
  subtotal: number;
  descuento: number;
  montoDescuento: number;
  total: number;
  formatoPrecio: (valor: number) => string;
}) {
  return (
    <div className="resumen">
      <div>
        <span>Subtotal productos</span>
        <strong>{formatoPrecio(subtotalSinDescuentos)}</strong>
      </div>

      {descuentoProductos > 0 && (
        <div>
          <span>Desc. productos</span>
          <strong>- {formatoPrecio(descuentoProductos)}</strong>
        </div>
      )}

      <div>
        <span>Subtotal</span>
        <strong>{formatoPrecio(subtotal)}</strong>
      </div>

      <div>
        <span>Desc. pedido ({descuento}%)</span>
        <strong>- {formatoPrecio(montoDescuento)}</strong>
      </div>

      <div className="total">
        <span>Total</span>
        <strong>{formatoPrecio(total)}</strong>
      </div>
    </div>
  );
}
