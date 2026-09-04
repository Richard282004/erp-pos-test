import { apiFetch } from "./client";

export type Producto = {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
  categoria: string;
};

export type Categoria = {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type CategoriaInput = {
  nombre: string;
  descripcion: string | null;
};

export type ProductoInput = {
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  id_categoria: number | null;
  activo: boolean;
};

export const listarProductos = (token: string | null) =>
  apiFetch<Producto[]>("/productos/", { token });

export const listarCategorias = (token: string | null, incluirInactivas = false) =>
  apiFetch<Categoria[]>(
    `/categorias/${incluirInactivas ? "?incluir_inactivas=true" : ""}`,
    { token }
  );

export const crearCategoria = (input: CategoriaInput, token: string | null) =>
  apiFetch<Categoria>("/categorias/", { method: "POST", body: input, token });

export const actualizarCategoria = (id: number, input: CategoriaInput, token: string | null) =>
  apiFetch<Categoria>(`/categorias/${id}`, { method: "PUT", body: input, token });

export const eliminarCategoria = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string; productos_activos: number }>(`/categorias/${id}`, {
    method: "DELETE",
    token,
  });

export const reactivarCategoria = (id: number, token: string | null) =>
  apiFetch<Categoria>(`/categorias/${id}/reactivar`, { method: "POST", token });

export const borrarCategoriaDefinitivo = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/categorias/${id}/definitivo`, { method: "DELETE", token });

export const usoCategorias = (token: string | null) =>
  apiFetch<Record<string, number>>("/categorias/uso", { token });

export const crearProducto = (input: ProductoInput, token: string | null) =>
  apiFetch<{ id_producto: number }>("/productos/", { method: "POST", body: input, token });

export const actualizarProducto = (id: number, input: ProductoInput, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/productos/${id}`, { method: "PUT", body: input, token });

export const eliminarProducto = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/productos/${id}`, { method: "DELETE", token });

// ---- Recetas y costos (Inventario) ----

export type ProductoCosto = {
  id_producto: number;
  nombre: string;
  categoria: string;
  precio: number;
  costo: number;
  lineas_receta: number;
};

export type RecetaLineaDetalle = {
  id_insumo: number;
  nombre: string;
  unidad: string;
  costo_promedio: number;
  activo: boolean;
  cantidad: number;
  subtotal: number;
};

export const listarProductosConCosto = (token: string | null) =>
  apiFetch<ProductoCosto[]>("/productos/costos", { token });

export const obtenerReceta = (idProducto: number, token: string | null) =>
  apiFetch<RecetaLineaDetalle[]>(`/productos/${idProducto}/receta`, { token });

export const guardarReceta = (
  idProducto: number,
  lineas: { id_insumo: number; cantidad: number }[],
  token: string | null
) =>
  apiFetch<{ mensaje: string }>(`/productos/${idProducto}/receta`, {
    method: "PUT",
    body: { lineas },
    token,
  });
