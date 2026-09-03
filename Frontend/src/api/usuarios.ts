import { apiFetch } from "./client";

export type Usuario = {
  id_usuario: number;
  username: string;
  nombre: string;
  apellido: string;
  id_rol: number;
  id_sucursal: number;
  activo: boolean;
};

export type UsuarioInput = {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  id_rol: number;
  id_sucursal: number;
};

export type UsuarioEditInput = {
  nombre: string;
  apellido: string;
  id_rol: number;
  id_sucursal: number;
  password?: string;
};

export const listarUsuarios = (token: string | null) =>
  apiFetch<Usuario[]>("/usuarios/", { token });

export const crearUsuario = (input: UsuarioInput, token: string | null) =>
  apiFetch<Usuario>("/usuarios/", { method: "POST", body: input, token });

export const actualizarUsuario = (id: number, input: UsuarioEditInput, token: string | null) =>
  apiFetch<Usuario>(`/usuarios/${id}`, { method: "PUT", body: input, token });

export const desactivarUsuario = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/usuarios/${id}`, { method: "DELETE", token });

export const reactivarUsuario = (id: number, token: string | null) =>
  apiFetch<Usuario>(`/usuarios/${id}/reactivar`, { method: "POST", token });
