import { precioUnitario, type ItemCarrito } from "../../pages/PosPage";

export function ItemCarritoRow({
  item,
  formatoPrecio,
  onCambiarCantidad,
  onCambiarDescuento,
}: {
  item: ItemCarrito;
  formatoPrecio: (valor: number) => string;
  onCambiarCantidad: (lineId: string, cambio: number) => void;
  onCambiarDescuento: (lineId: string, descuento: number) => void;
}) {
  const unitario = precioUnitario(item);
  const precioOriginal = unitario * item.cantidad;
  const precioConDescuento = precioOriginal * (1 - item.descuento / 100);

  return (
    <div className="item-carrito">
      <div className="item-superior">
        <div>
          <strong>{item.nombre}</strong>
          <span>{formatoPrecio(unitario)} c/u</span>
          {item.modificadores.length > 0 && (
            <ul className="item-mods">
              {item.modificadores.map((m) => (
                <li key={m.id_modificador}>
                  {m.nombre}
                  {m.precio_adicional > 0 && ` +${formatoPrecio(m.precio_adicional)}`}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="precio-item">
          {item.descuento > 0 && (
            <span className="precio-original">{formatoPrecio(precioOriginal)}</span>
          )}
          <strong>{formatoPrecio(precioConDescuento)}</strong>
        </div>
      </div>

      {/* CANTIDAD */}
      <div className="cantidad">
        <button onClick={() => onCambiarCantidad(item.lineId, -1)}>−</button>
        <span>{item.cantidad}</span>
        <button onClick={() => onCambiarCantidad(item.lineId, 1)}>+</button>
      </div>

      {/* DESCUENTO POR PRODUCTO */}
      <div className="descuento-producto">
        <label>Descuento producto</label>
        <div>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min="0"
            max="100"
            value={item.descuento}
            onChange={(evento) => onCambiarDescuento(item.lineId, Number(evento.target.value))}
          />
          <span>%</span>
        </div>
      </div>
    </div>
  );
}
