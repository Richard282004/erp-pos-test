export type MedioPago = "EFECTIVO" | "DEBITO" | "CREDITO" | "TRANSFERENCIA";

const BILLETES = [1000, 2000, 5000, 10000, 20000];

/** Exacto + hasta 3 billetes redondos con los que suele pagar el cliente. */
function opcionesMontoRapido(total: number): number[] {
  const masGrandes = BILLETES.filter((b) => b > total);
  while (masGrandes.length < 3) {
    const ultimo = masGrandes[masGrandes.length - 1] ?? Math.ceil(total / 10000) * 10000;
    const siguiente = ultimo + 10000;
    if (masGrandes.includes(siguiente)) break;
    masGrandes.push(siguiente);
  }
  return [total, ...masGrandes.slice(0, 3)];
}

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

          <div className="monto-rapido-grid">
            {opcionesMontoRapido(total).map((monto, i) => (
              <button
                key={monto}
                type="button"
                className={"monto-rapido-chip" + (montoRecibido === monto ? " activo" : "")}
                onClick={() => onChangeMontoRecibido(monto)}
              >
                {i === 0 ? "Exacto" : formatoPrecio(monto)}
              </button>
            ))}
          </div>

          <input
            className="monto-input"
            type="number"
            onFocus={(e) => e.target.select()}
            value={montoRecibido ?? ""}
            onChange={(e) => onChangeMontoRecibido(e.target.value === "" ? null : Number(e.target.value))}
          />

          <div className="payment-totals">
            <small>Subtotal productos: {formatoPrecio(subtotal)}</small>
            <small>Desc. productos: {formatoPrecio(descuentoProductos)}</small>
            <strong>Total: {formatoPrecio(total)}</strong>
          </div>

          {montoRecibido === null ? (
            <div className="vuelto-row">
              <span className="falta-badge">Ingresá el monto que te dio el cliente.</span>
            </div>
          ) : (
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
