import { useMemo, useState } from "react";
import type { Producto } from "../../api/productos";

/**
 * Va plegado por defecto: con muchos productos la lista empujaba el resto de
 * las opciones del panel demasiado abajo. Abierto, la lista se desplaza sola
 * en vez de estirar el panel, y hay un buscador para no scrollear a mano.
 */
export function GestionProductos({
  productos,
  formatoPrecio,
  onAgregar,
  onEditar,
  onEliminar,
}: {
  productos: Producto[];
  formatoPrecio: (valor: number) => string;
  onAgregar: () => void;
  onEditar: (p: Producto) => void;
  onEliminar: (p: Producto) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.categoria ?? "").toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  return (
    <div className="gestion-productos">
      <div className="gestion-productos-header">
        <button
          className="gp-toggle"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
        >
          <span className={"gp-chevron" + (abierto ? " abierto" : "")}>▸</span>
          Gestión de productos
          <span className="gp-conteo">{productos.length}</span>
        </button>
        <button className="gp-add" onClick={onAgregar}>
          ➕ Agregar
        </button>
      </div>

      {abierto && (
        <>
          {productos.length > 8 && (
            <input
              className="gp-buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto…"
            />
          )}

          <ul className="gp-lista">
            {filtrados.map((producto) => (
              <li key={producto.id_producto} className="gp-item">
                <div className="gp-item-info">
                  <strong>{producto.nombre}</strong>
                  <small>
                    {producto.categoria} · {formatoPrecio(producto.precio)}
                  </small>
                </div>
                <div className="gp-item-acciones">
                  <button
                    className="gp-icon"
                    title="Editar"
                    onClick={() => onEditar(producto)}
                  >
                    ✏️
                  </button>
                  <button
                    className="gp-icon"
                    title="Eliminar"
                    onClick={async () => {
                      if (!confirm(`Eliminar "${producto.nombre}"?`)) return;
                      try {
                        await onEliminar(producto);
                      } catch (err) {
                        alert(
                          err instanceof Error && err.message
                            ? err.message
                            : "Error al eliminar"
                        );
                        console.error(err);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
            {filtrados.length === 0 && (
              <li className="gp-item">
                {productos.length === 0 ? "Sin productos." : "Sin coincidencias."}
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
