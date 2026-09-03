import { apiFetch } from "./client";

export type UnidadBase = "g" | "ml" | "u";

export type Insumo = {
  id_insumo: number;
  nombre: string;
  unidad: UnidadBase;
  stock_actual: number;
  stock_minimo: number;
  costo_promedio: number;
  activo: boolean;
};

export type InsumoCreate = {
  nombre: string;
  unidad: UnidadBase;
  stock_minimo: number;
};

export type InsumoUpdate = {
  nombre: string;
  stock_minimo: number;
};

export const listarInsumos = (token: string | null, incluirInactivos = false) =>
  apiFetch<Insumo[]>(
    `/insumos/${incluirInactivos ? "?incluir_inactivos=true" : ""}`,
    { token }
  );

export const crearInsumo = (input: InsumoCreate, token: string | null) =>
  apiFetch<Insumo>("/insumos/", { method: "POST", body: input, token });

export const actualizarInsumo = (id: number, input: InsumoUpdate, token: string | null) =>
  apiFetch<Insumo>(`/insumos/${id}`, { method: "PUT", body: input, token });

export const eliminarInsumo = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/insumos/${id}`, { method: "DELETE", token });

export const reactivarInsumo = (id: number, token: string | null) =>
  apiFetch<Insumo>(`/insumos/${id}/reactivar`, { method: "POST", token });

/** Unidades de compra permitidas segun la unidad base del insumo. */
export function unidadesCompra(base: UnidadBase): string[] {
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "L"];
  return ["u"];
}

export function etiquetaUnidad(u: UnidadBase): string {
  return u === "g" ? "gramos" : u === "ml" ? "mililitros" : "unidades";
}
