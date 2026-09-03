import type { Producto } from "../../api/productos";
import { ProductoCard } from "./ProductoCard";

export function CatalogoGrid({
  productos,
  loading,
  error,
  onReintentar,
  formatoPrecio,
  onAgregar,
}: {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  onReintentar: () => void;
  formatoPrecio: (valor: number) => string;
  onAgregar: (p: Producto) => void;
}) {
  return (
    <div className="productos-grid">
      {loading ? (
        <div className="cargando">Cargando productos...</div>
      ) : error ? (
        <div className="error-productos">
          <div>{error}</div>
          <button onClick={onReintentar}>Reintentar</button>
        </div>
      ) : (
        productos.map((producto) => (
          <ProductoCard
            key={producto.id_producto}
            producto={producto}
            formatoPrecio={formatoPrecio}
            onAgregar={onAgregar}
          />
        ))
      )}
    </div>
  );
}
