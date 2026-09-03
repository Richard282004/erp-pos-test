import type { Producto } from "../../api/productos";
import { ImageWithFallback } from "../common/ImageWithFallback";

export function ProductoCard({
  producto,
  formatoPrecio,
  onAgregar,
}: {
  producto: Producto;
  formatoPrecio: (valor: number) => string;
  onAgregar: (p: Producto) => void;
}) {
  return (
    <button className="producto" onClick={() => onAgregar(producto)}>
      <ImageWithFallback src={producto.imagen_url} alt={producto.nombre} />

      <div className="producto-info">
        <small>{producto.categoria}</small>
        <h3>{producto.nombre}</h3>
        <strong>{formatoPrecio(producto.precio)}</strong>
      </div>
    </button>
  );
}
