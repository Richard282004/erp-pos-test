import { useState } from "react";
import type { Producto } from "../../api/productos";
import type { Modificador } from "../../api/modificadores";

export function ModificadorSelector({
  producto,
  modificadores,
  formatoPrecio,
  onCancel,
  onConfirm,
}: {
  producto: Producto;
  modificadores: Modificador[];
  formatoPrecio: (v: number) => string;
  onCancel: () => void;
  onConfirm: (elegidos: Modificador[]) => void;
}) {
  const [sel, setSel] = useState<number[]>([]);

  const toggle = (id: number) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const elegidos = modificadores.filter((m) => sel.includes(m.id_modificador));
  const extra = elegidos.reduce((s, m) => s + m.precio_adicional, 0);

  return (
    <div className="add-product-modal" onClick={onCancel}>
      <div className="mod-selector" onClick={(e) => e.stopPropagation()}>
        <h3>{producto.nombre}</h3>
        <p className="mod-selector-precio">{formatoPrecio(producto.precio)}</p>

        <div className="mod-selector-lista">
          {modificadores.map((m) => (
            <label key={m.id_modificador} className="mod-check">
              <input
                type="checkbox"
                checked={sel.includes(m.id_modificador)}
                onChange={() => toggle(m.id_modificador)}
              />
              <span>
                {m.nombre}
                {m.precio_adicional > 0 && <em> +{formatoPrecio(m.precio_adicional)}</em>}
              </span>
            </label>
          ))}
        </div>

        <div className="mod-selector-acciones">
          <button onClick={onCancel}>Cancelar</button>
          <button className="mod-selector-agregar" onClick={() => onConfirm(elegidos)}>
            Agregar · {formatoPrecio(producto.precio + extra)}
          </button>
        </div>
      </div>
    </div>
  );
}
