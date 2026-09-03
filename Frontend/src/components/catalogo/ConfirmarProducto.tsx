import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Producto } from "../../api/productos";
import { ImageWithFallback } from "../common/ImageWithFallback";

/**
 * Confirmación al elegir un producto: muestra la descripción y el precio antes
 * de sumarlo. En el celular evita el toque en el producto de al lado; en
 * escritorio el foco arranca en "Agregar", así el cajero encadena clic + Enter
 * sin soltar el ritmo.
 */
export function ConfirmarProducto({
  producto,
  formatoPrecio,
  onAgregar,
  onCancelar,
}: {
  producto: Producto;
  formatoPrecio: (valor: number) => string;
  onAgregar: () => void;
  onCancelar: () => void;
}) {
  const botonAgregar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botonAgregar.current?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelar();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onAgregar();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onAgregar, onCancelar]);

  return createPortal(
    <div className="confirmar-producto" onClick={onCancelar}>
      <div
        className="confirmar-producto-hoja"
        role="dialog"
        aria-modal="true"
        aria-label={`Agregar ${producto.nombre}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmar-producto-foto">
          <ImageWithFallback src={producto.imagen_url} alt={producto.nombre} />
        </div>

        <div className="confirmar-producto-datos">
          <small>{producto.categoria}</small>
          <h3>{producto.nombre}</h3>
          {producto.descripcion && <p>{producto.descripcion}</p>}
          <strong>{formatoPrecio(producto.precio)}</strong>
        </div>

        <div className="confirmar-producto-botones">
          <button className="cp-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button ref={botonAgregar} className="cp-agregar" onClick={onAgregar}>
            Agregar
          </button>
        </div>

        <small className="confirmar-producto-atajos">Enter agrega · Esc cancela</small>
      </div>
    </div>,
    document.body
  );
}
