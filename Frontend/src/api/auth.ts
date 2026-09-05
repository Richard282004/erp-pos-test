import { apiFetch } from "./client";

export type CurrentUser = {
  id_usuario?: number;
  id_rol?: number;
  id_sucursal?: number;
  username?: string;
  nombre?: string;
  apellido?: string;
} | null;

export type LoginResponse = { access_token: string };

export const login = (username: string, password: string) =>
  apiFetch<LoginResponse>("/usuarios/login", { method: "POST", body: { username, password } });

export const me = (token: string) =>
  apiFetch<NonNullable<CurrentUser>>("/usuarios/me", { token });

export type AutorizacionResponse = { token: string; autorizado_por: string };

/** Un supervisor/admin autoriza algo puntual (ej. un descuento) sin cerrar
 * la sesión del cajero. El token que devuelve dura pocos minutos. */
export const autorizar = (
  username: string,
  password: string,
  descuentoPct: number,
  token: string | null,
) =>
  apiFetch<AutorizacionResponse>("/usuarios/autorizar", {
    method: "POST",
    body: { username, password, descuento_pct: descuentoPct },
    token,
  });

export const ROL_ADMIN = 1;
export const ROL_SUPERVISOR = 2;
export const ROL_CAJERO = 3;

export function esAdmin(user: CurrentUser): boolean {
  return user?.id_rol === ROL_ADMIN;
}

export function puedeGestionarProductos(user: CurrentUser): boolean {
  return user?.id_rol === ROL_ADMIN || user?.id_rol === ROL_SUPERVISOR;
}

export function puedeGestionarUsuarios(user: CurrentUser): boolean {
  return user?.id_rol === ROL_ADMIN;
}

export function nombreRol(user: CurrentUser): string {
  switch (user?.id_rol) {
    case ROL_ADMIN:
      return 'Administrador';
    case ROL_SUPERVISOR:
      return 'Supervisor';
    case ROL_CAJERO:
      return 'Cajero';
    default:
      return 'Usuario';
  }
}

export const ROLES: { id_rol: number; nombre: string; descripcion: string }[] = [
  { id_rol: ROL_ADMIN, nombre: 'Administrador', descripcion: 'Acceso total, incluye Administración.' },
  { id_rol: ROL_SUPERVISOR, nombre: 'Supervisor', descripcion: 'Gestión de catálogo de productos y venta. Sin acceso a Administración.' },
  { id_rol: ROL_CAJERO, nombre: 'Cajero', descripcion: 'Operación de venta (POS). Sin gestión de productos ni administración.' },
];
