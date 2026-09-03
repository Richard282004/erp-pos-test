import type { Producto } from "../../api/productos";

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
  return (
    <div className="gestion-productos">
      <div className="gestion-productos-header">
        <span>Gestión de productos</span>
        <button className="gp-add" onClick={onAgregar}>
          ➕ Agregar
        </button>
      </div>

      <ul className="gp-lista">
        {productos.map((producto) => (
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
        {productos.length === 0 && <li className="gp-item">Sin productos.</li>}
      </ul>
    </div>
  );
}
