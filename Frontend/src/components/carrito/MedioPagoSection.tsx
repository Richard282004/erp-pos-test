export type MedioPago = "EFECTIVO" | "DEBITO" | "CREDITO" | "TRANSFERENCIA";

export function MedioPagoSection({
  medioPago,
  onChangeMedioPago,
  montoRecibido,
  onChangeMontoRecibido,
  subtotal,
  descuentoProductos,
  total,
  formatoPrecio,
}: {
  medioPago: MedioPago;
  onChangeMedioPago: (m: MedioPago) => void;
  montoRecibido: number | null;
  onChangeMontoRecibido: (m: number | null) => void;
  subtotal: number;
  descuentoProductos: number;
  total: number;
  formatoPrecio: (valor: number) => string;
}) {
  return (
    <div className="payment-card">
      <div className="payment-row">
        <label>Medio de pago</label>
        <select
          className="payment-select"
          value={medioPago}
          onChange={(e) => onChangeMedioPago(e.target.value as MedioPago)}
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="DEBITO">Débito</option>
          <option value="CREDITO">Crédito</option>
          <option value="TRANSFERENCIA">Transferencia</option>
        </select>
      </div>

      {medioPago === "EFECTIVO" && (
        <div className="cash-section">
          <label>Monto recibido</label>
          <input
            className="monto-input"
            type="number"
            value={montoRecibido ?? ""}
            onChange={(e) => onChangeMontoRecibido(e.target.value === "" ? null : Number(e.target.value))}
          />

          <div className="payment-totals">
            <small>Subtotal productos: {formatoPrecio(subtotal)}</small>
            <small>Desc. productos: {formatoPrecio(descuentoProductos)}</small>
            <strong>Total: {formatoPrecio(total)}</strong>
          </div>

          {montoRecibido !== null && (
            <div className="vuelto-row">
              {montoRecibido >= total ? (
                <span className="vuelto-badge">Vuelto: {formatoPrecio(montoRecibido - total)}</span>
              ) : (
                <span className="falta-badge">Falta: {formatoPrecio(total - montoRecibido)}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
