import { apiFetch } from "./client";

export type EventoAuditoria = {
  id_auditoria: number;
  id_usuario: number | null;
  username: string;
  accion: "ANULAR_PEDIDO" | "BORRAR_DEFINITIVO" | "AUTORIZAR_DESCUENTO" | "LIMPIAR_TRANSACCIONES";
  entidad: string;
  id_entidad: number | null;
  detalle: string | null;
  fecha: string;
};

export const listarAuditoria = (token: string | null, limite = 200) =>
  apiFetch<EventoAuditoria[]>(`/auditoria/?limite=${limite}`, { token });
