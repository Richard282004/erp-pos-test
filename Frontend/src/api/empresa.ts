import { apiFetch } from "./client";

export type Empresa = {
  id_empresa: number;
  nombre: string;
  razon_social: string | null;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  mensaje_ticket: string | null;
};

export type EmpresaInput = {
  nombre: string;
  razon_social: string | null;
  rut: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  mensaje_ticket: string | null;
};

export type SucursalEmisor = {
  nombre: string;
  direccion: string | null;
  comuna: string | null;
  telefono: string | null;
};

/** Lo que va impreso en la cabecera del ticket. */
export type DatosEmisor = {
  empresa: Empresa | null;
  sucursal: SucursalEmisor | null;
};

export const obtenerEmpresa = (token: string | null) =>
  apiFetch<Empresa>("/empresa/", { token });

export const obtenerEmisor = (token: string | null) =>
  apiFetch<DatosEmisor>("/empresa/emisor", { token });

export const actualizarEmpresa = (input: EmpresaInput, token: string | null) =>
  apiFetch<Empresa>("/empresa/", { method: "PUT", body: input, token });
