import { useMemo, useState } from "react";
import type { Producto } from "../../api/productos";
import type { Modificador } from "../../api/modificadores";

const MAX_CANTIDAD = 99;
const MAX_POR_MOD = 20;

export type ModElegido = { mod: Modificador; cantidad: number };

/** "Sin cebolla" -> "Cebolla" para mostrarlo como ingrediente que viene incluido. */
function nombreIngrediente(nombre: string): string {
  const m = nombre.match(/^\s*sin\s+(.+)$/i);
  if (!m) return nombre;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

export function ModificadorSelector({
  producto,
  modificadores,
  formatoPrecio,
  cantidadInicial = 1,
  onCancel,
  onConfirm,
}: {
  producto: Producto;
  modificadores: Modificador[];
  formatoPrecio: (v: number) => string;
  cantidadInicial?: number;
  onCancel: () => void;
  onConfirm: (elegidos: ModElegido[], cantidad: number) => void;
}) {
  const { extras, incluidos } = useMemo(() => {
    const extras = modificadores.filter((m) => m.tipo === "AGREGAR");
    const incluidos = modificadores.filter((m) => m.tipo === "QUITAR");
    return { extras, incluidos };
  }, [modificadores]);

  // Extras: id -> cantidad (0 = no agregado).
  const [cantExtra, setCantExtra] = useState<Record<number, number>>({});
  // Ingredientes que el cliente NO quiere (los QUITAR seleccionados).
  const [quitados, setQuitados] = useState<Set<number>>(new Set());
  const [cantidad, setCantidad] = useState(cantidadInicial);

  const cambiarCantidad = (delta: number) =>
    setCantidad((c) => Math.min(MAX_CANTIDAD, Math.max(1, c + delta)));

  const cambiarExtra = (id: number, delta: number) =>
    setCantExtra((prev) => {
      const actual = prev[id] ?? 0;
      const nuevo = Math.min(MAX_POR_MOD, Math.max(0, actual + delta));
      return { ...prev, [id]: nuevo };
    });

  const toggleQuitar = (id: number) =>
    setQuitados((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const extraUnitario = extras.reduce(
    (s, m) => s + m.precio_adicional * (cantExtra[m.id_modificador] ?? 0),
    0,
  );
  const totalLinea = (producto.precio + extraUnitario) * cantidad;

  const confirmar = () => {
    const elegidos: ModElegido[] = [];
    for (const m of extras) {
      const c = cantExtra[m.id_modificador] ?? 0;
      if (c > 0) elegidos.push({ mod: m, cantidad: c });
    }
    for (const m of incluidos) {
      if (quitados.has(m.id_modificador)) elegidos.push({ mod: m, cantidad: 1 });
    }
    onConfirm(elegidos, cantidad);
  };

  return (
    <div className="add-product-modal" onClick={onCancel}>
      <div className="mod-selector" onClick={(e) => e.stopPropagation()}>
        <div className="mod-selector-cab">
          <button className="mod-selector-x" onClick={onCancel} aria-label="Cerrar">
            ✕
          </button>
          <div>
            <h3>{producto.nombre}</h3>
            <p className="mod-selector-precio">{formatoPrecio(producto.precio)}</p>
          </div>
        </div>

        <div className="mod-selector-cuerpo">
          {incluidos.length > 0 && (
            <section className="mod-grupo">
              <h4>Personalizar</h4>
              <p className="mod-grupo-nota">Vienen incluidos. Destildá lo que no quieras.</p>
              {incluidos.map((m) => {
                const quitado = quitados.has(m.id_modificador);
                return (
                  <label key={m.id_modificador} className="mod-fila">
                    <span className={"mod-fila-nombre" + (quitado ? " quitado" : "")}>
                      {nombreIngrediente(m.nombre)}
                    </span>
                    <input
                      type="checkbox"
                      className="mod-fila-check"
                      checked={!quitado}
                      onChange={() => toggleQuitar(m.id_modificador)}
                    />
                  </label>
                );
              })}
            </section>
          )}

          {extras.length > 0 && (
            <section className="mod-grupo">
              <h4>Extra</h4>
              {extras.map((m) => {
                const c = cantExtra[m.id_modificador] ?? 0;
                return (
                  <div key={m.id_modificador} className="mod-fila">
                    <span className="mod-fila-nombre">
                      {m.nombre}
                      {m.precio_adicional > 0 && (
                        <em className="mod-fila-precio"> +{formatoPrecio(m.precio_adicional)} c/u</em>
                      )}
                    </span>
                    <div className="mod-stepper">
                      <button
                        type="button"
                        onClick={() => cambiarExtra(m.id_modificador, -1)}
                        disabled={c <= 0}
                        aria-label={`Menos ${m.nombre}`}
                      >
                        −
                      </button>
                      <span aria-live="polite">{c}</span>
                      <button
                        type="button"
                        onClick={() => cambiarExtra(m.id_modificador, 1)}
                        disabled={c >= MAX_POR_MOD}
                        aria-label={`Más ${m.nombre}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="mod-grupo">
            <h4>Cantidad</h4>
            <div className="mod-fila">
              <span className="mod-fila-nombre">Unidades de este producto</span>
              <div className="mod-stepper">
                <button type="button" onClick={() => cambiarCantidad(-1)} disabled={cantidad <= 1} aria-label="Menos uno">
                  −
                </button>
                <span aria-live="polite">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => cambiarCantidad(1)}
                  disabled={cantidad >= MAX_CANTIDAD}
                  aria-label="Más uno"
                >
                  +
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="mod-selector-pie">
          <strong className="mod-selector-total">{formatoPrecio(totalLinea)}</strong>
          <button className="mod-selector-agregar" onClick={confirmar}>
            Agregar{cantidad > 1 ? ` ${cantidad}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
