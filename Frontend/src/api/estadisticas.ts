import { apiFetch, API_BASE_URL, ApiError } from "./client";

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

/** Descarga un CSV del reporte ("ventas" o "productos") para el rango dado. */
export async function descargarReporte(
  tipo: "ventas" | "productos",
  token: string | null,
  desde?: string,
  hasta?: string,
): Promise<void> {
  const qs = new URLSearchParams();
  if (desde) qs.set("desde", desde);
  if (hasta) qs.set("hasta", hasta);
  const q = qs.toString();
  const res = await fetch(`${API_BASE_URL}/estadisticas/${tipo}.csv${q ? "?" + q : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(`No se pudo generar el reporte (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const rango = [desde, hasta].filter(Boolean).join("_");
  a.download =
    res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
    `${tipo}${rango ? "_" + rango : ""}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
