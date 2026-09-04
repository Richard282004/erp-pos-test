import { apiFetch } from "./client";

export type EstadoMantenimiento = { conteos: Record<string, number>; total: number };
export type ResultadoLimpieza = { mensaje: string; conteos: Record<string, number>; total: number };

export const estadoMantenimiento = (token: string | null) =>
  apiFetch<EstadoMantenimiento>("/mantenimiento/estado", { token });

export const limpiarTransacciones = (token: string | null) =>
  apiFetch<ResultadoLimpieza>("/mantenimiento/limpiar-transacciones", { method: "POST", token });
