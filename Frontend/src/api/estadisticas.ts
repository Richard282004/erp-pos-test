import { apiFetch } from "./client";

export type DashboardData = {
  desde: string;
  hasta: string;
  resumen: {
    pedidos: number;
    ventas: number;
    ticket_promedio: number;
    costo: number;
    ganancia_bruta: number;
    margen: number;
  };
  por_metodo: { metodo_pago: string; pedidos: number; monto: number }[];
  por_tipo: { tipo_pedido: string; pedidos: number; monto: number }[];
  por_dia: { dia: string; pedidos: number; ventas: number }[];
  top_productos: { id_producto: number | null; nombre: string; cantidad: number; monto: number }[];
};

export const getDashboard = (token: string | null, desde?: string, hasta?: string) => {
  const qs = new URLSearchParams();
  if (desde) qs.set("desde", desde);
  if (hasta) qs.set("hasta", hasta);
  const q = qs.toString();
  return apiFetch<DashboardData>(`/estadisticas/dashboard${q ? "?" + q : ""}`, { token });
};
