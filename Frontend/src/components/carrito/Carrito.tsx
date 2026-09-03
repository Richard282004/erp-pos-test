import type { ItemCarrito } from "../../pages/PosPage";
import type { TipoPedido } from "../catalogo/TipoPedidoSelector";
import { ItemCarritoRow } from "./ItemCarritoRow";
import { ResumenPedido } from "./ResumenPedido";
import { MedioPagoSection, type MedioPago } from "./MedioPagoSection";

export function Carrito({
  tipoPedido,
  carrito,
  onVaciar,
  onCambiarCantidad,
  onCambiarDescuentoProducto,
  observacion,
  onChangeObservacion,
  descuento,
  onChangeDescuento,
  medioPago,
  onChangeMedioPago,
  montoRecibido,
  onChangeMontoRecibido,
  subtotalSinDescuentos,
  descuentoProductos,
  subtotal,
  montoDescuento,
  total,
  formatoPrecio,
  sendingPedido,
  mensajePedido,
  errorPedido,
  onCobrar,
}: {
  tipoPedido: TipoPedido;
  carrito: ItemCarrito[];
  onVaciar: () => void;
  onCambiarCantidad: (lineId: string, cambio: number) => void;
  onCambiarDescuentoProducto: (lineId: string, descuento: number) => void;
  observacion: string;
  onChangeObservacion: (v: string) => void;
  descuento: number;
  onChangeDescuento: (v: number) => void;
  medioPago: MedioPago;
  onChangeMedioPago: (m: MedioPago) => void;
  montoRecibido: number | null;
  onChangeMontoRecibido: (m: number | null) => void;
  subtotalSinDescuentos: number;
  descuentoProductos: number;
  subtotal: number;
  montoDescuento: number;
  total: number;
  formatoPrecio: (valor: number) => string;
  sendingPedido: boolean;
  mensajePedido: string | null;
  errorPedido: string | null;
  onCobrar: () => void;
}) {
  return (
    <aside className="carrito">
      <div className="carrito-header">
        <h2>Pedido actual</h2>

        <div className="acciones-carrito">
          {carrito.length > 0 && (
            <button className="vaciar-carrito" onClick={onVaciar}>
              Vaciar
            </button>
          )}
          <span className="tipo-badge">{tipoPedido}</span>
        </div>
      </div>

      <div className="items-carrito">
        {carrito.length === 0 ? (
          <div className="carrito-vacio">
            <div className="icono">🍔</div>
            <h3>El carrito está vacío</h3>
            <p>Toca un producto para agregarlo.</p>
          </div>
        ) : (
          carrito.map((item) => (
            <ItemCarritoRow
              key={item.lineId}
              item={item}
              formatoPrecio={formatoPrecio}
              onCambiarCantidad={onCambiarCantidad}
              onCambiarDescuento={onCambiarDescuentoProducto}
            />
          ))
        )}
      </div>

      {/* OBSERVACIONES */}
      <div className="controles-pedido">
        <label>
          Observación
          <textarea
            value={observacion}
            onChange={(evento) => onChangeObservacion(evento.target.value)}
            placeholder="Ej: cortar por la mitad..."
          />
        </label>

        {/* DESCUENTO GENERAL */}
        <label>
          Descuento total del pedido (%)
          <input
            type="number"
            min="0"
            max="100"
            value={descuento}
            onChange={(evento) => {
              const nuevoDescuento = Number(evento.target.value);
              onChangeDescuento(Math.min(100, Math.max(0, nuevoDescuento)));
            }}
          />
        </label>
      </div>

      {/* MEDIO DE PAGO */}
      <MedioPagoSection
        medioPago={medioPago}
        onChangeMedioPago={onChangeMedioPago}
        montoRecibido={montoRecibido}
        onChangeMontoRecibido={onChangeMontoRecibido}
        subtotal={subtotal}
        descuentoProductos={descuentoProductos}
        total={total}
        formatoPrecio={formatoPrecio}
      />

      {/* RESUMEN */}
      <ResumenPedido
        subtotalSinDescuentos={subtotalSinDescuentos}
        descuentoProductos={descuentoProductos}
        subtotal={subtotal}
        descuento={descuento}
        montoDescuento={montoDescuento}
        total={total}
        formatoPrecio={formatoPrecio}
      />

      {/* COBRAR */}
      <div>
        <button
          className="cobrar"
          disabled={
            carrito.length === 0 ||
            sendingPedido ||
            (medioPago === "EFECTIVO" && montoRecibido !== null && montoRecibido < total)
          }
          onClick={onCobrar}
        >
          {sendingPedido
            ? "Procesando..."
            : medioPago === "EFECTIVO" && montoRecibido !== null && montoRecibido >= total
              ? `Cobrar ${formatoPrecio(total)} • Entregar ${formatoPrecio(montoRecibido - total)} de vuelto`
              : `Cobrar ${formatoPrecio(total)}`}
        </button>

        {mensajePedido && <div className="mensaje-pedido">{mensajePedido}</div>}
        {errorPedido && <div className="error-pedido">{errorPedido}</div>}
      </div>
    </aside>
  );
}
