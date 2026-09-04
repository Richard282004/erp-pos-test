import type { Categoria } from "../../api/productos";
import { ImagenProductoInput } from "./ImagenProductoInput";

export type NuevoProducto = {
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string | null;
  id_categoria: number | null;
  activo: boolean;
};

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const pf = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function AddProductModal({
  open,
  newProduct,
  onChangeNewProduct,
  categoriasBackend,
  editingProductId,
  creatingProduct,
  createProductError,
  costoReceta,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  newProduct: NuevoProducto;
  onChangeNewProduct: (p: NuevoProducto) => void;
  categoriasBackend: Categoria[];
  editingProductId: number | null;
  creatingProduct: boolean;
  createProductError: string | null;
  costoReceta?: number | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const precio = newProduct.precio || 0;
  const tieneCosto = editingProductId != null && costoReceta != null && costoReceta > 0;
  const ganancia = tieneCosto ? precio - (costoReceta as number) : 0;
  const margen = tieneCosto && precio > 0 ? ganancia / precio : 0;

  return (
    <div className="add-product-modal">
      <div className="add-product-form">
        <h3>{editingProductId != null ? "Editar producto" : "Agregar producto"}</h3>
        <label>
          Nombre
          <input
            value={newProduct.nombre}
            onChange={(e) => onChangeNewProduct({ ...newProduct, nombre: e.target.value })}
          />
        </label>
        <label>
          Descripción
          <input
            value={newProduct.descripcion}
            onChange={(e) => onChangeNewProduct({ ...newProduct, descripcion: e.target.value })}
          />
        </label>
        <label>
          Precio
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={newProduct.precio}
            onChange={(e) => onChangeNewProduct({ ...newProduct, precio: Number(e.target.value) })}
          />
        </label>

        {editingProductId != null && (
          <div className="modal-costo">
            {tieneCosto ? (
              <>
                <div><span>Costo (receta)</span><strong>{cf.format(costoReceta as number)}</strong></div>
                <div><span>Ganancia</span><strong>{cf.format(ganancia)}</strong></div>
                <div><span>Margen</span><strong>{pf.format(margen)}</strong></div>
              </>
            ) : (
              <p>Sin receta cargada. Definila en <strong>Administración → Recetas</strong> para ver el costo y el margen.</p>
            )}
          </div>
        )}
        <ImagenProductoInput
          valor={newProduct.imagen_url}
          onChange={(url) => onChangeNewProduct({ ...newProduct, imagen_url: url })}
        />
        <label>
          Categoria
          <select
            value={newProduct.id_categoria ?? ""}
            onChange={(e) =>
              onChangeNewProduct({
                ...newProduct,
                id_categoria: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          >
            <option value="">-- seleccionar --</option>
            {categoriasBackend.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: 8 }}>
          <button onClick={onSubmit} disabled={creatingProduct}>
            {creatingProduct ? "Guardando..." : editingProductId ? "Guardar cambios" : "Crear producto"}
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
            Cancelar
          </button>
        </div>
        {createProductError && <div className="error-productos">{createProductError}</div>}
      </div>
    </div>
  );
}
