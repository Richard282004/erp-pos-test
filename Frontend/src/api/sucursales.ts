import { apiFetch } from "./client";

export type Sucursal = {
  id_sucursal: number;
  nombre: string;
  direccion: string | null;
  comuna: string | null;
  telefono: string | null;
  activo: boolean;
};

export type SucursalInput = {
  nombre: string;
  direccion: string | null;
  comuna: string | null;
  telefono: string | null;
};

export const listarSucursales = (incluirInactivas = false) =>
  apiFetch<Sucursal[]>(
    `/sucursales/${incluirInactivas ? "?incluir_inactivas=true" : ""}`
  );

export const crearSucursal = (input: SucursalInput, token: string | null) =>
  apiFetch<Sucursal>("/sucursales/", { method: "POST", body: input, token });

export const actualizarSucursal = (id: number, input: SucursalInput, token: string | null) =>
  apiFetch<Sucursal>(`/sucursales/${id}`, { method: "PUT", body: input, token });

export const desactivarSucursal = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/sucursales/${id}`, { method: "DELETE", token });

export const reactivarSucursal = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/sucursales/${id}/reactivar`, { method: "POST", token });
