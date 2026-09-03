import { apiFetch } from "./client";

export type TipoModificador = "AGREGAR" | "QUITAR";

export type Modificador = {
  id_modificador: number;
  nombre: string;
  tipo: TipoModificador;
  precio_adicional: number;
  activo: boolean;
};

export type ModificadorInput = {
  nombre: string;
  tipo: TipoModificador;
  precio_adicional: number;
};

export const listarModificadores = (token: string | null, incluirInactivos = false) =>
  apiFetch<Modificador[]>(
    `/modificadores/${incluirInactivos ? "?incluir_inactivos=true" : ""}`,
    { token }
  );

/** { id_producto: [id_modificador, ...] } */
export const modificadoresPorProducto = (token: string | null) =>
  apiFetch<Record<string, number[]>>("/modificadores/asociaciones", { token });

export const crearModificador = (input: ModificadorInput, token: string | null) =>
  apiFetch<Modificador>("/modificadores/", { method: "POST", body: input, token });

export const actualizarModificador = (id: number, input: ModificadorInput, token: string | null) =>
  apiFetch<Modificador>(`/modificadores/${id}`, { method: "PUT", body: input, token });

export const eliminarModificador = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/modificadores/${id}`, { method: "DELETE", token });

export const reactivarModificador = (id: number, token: string | null) =>
  apiFetch<Modificador>(`/modificadores/${id}/reactivar`, { method: "POST", token });

export const setModificadoresProducto = (
  idProducto: number,
  idModificadores: number[],
  token: string | null
) =>
  apiFetch<{ mensaje: string }>(`/modificadores/producto/${idProducto}`, {
    method: "PUT",
    body: { id_modificadores: idModificadores },
    token,
  });
