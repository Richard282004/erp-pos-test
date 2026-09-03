import { apiFetch } from "./client";

export type PedidoItemInput = {
  id_producto: number;
  cantidad: number;
  descuento: number;
  modificadores: number[];
};

export type PagoInput = {
  metodo_pago: string;
  monto_recibido?: number | null;
};

// El servidor calcula precios, subtotal, total y turno. El cliente solo manda
// qué se pidió y cómo se paga.
export type PedidoInput = {
  tipo_pedido: "LOCAL" | "RETIRO" | "DELIVERY";
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  descuento: number;
  observacion: string;
  items: PedidoItemInput[];
  pago: PagoInput;
};

export const crearPedido = (input: PedidoInput, token: string | null) =>
  apiFetch<{ mensaje: string; id_pedido: number }>("/pedidos/", { method: "POST", body: input, token });

// ---- Listado / detalle / anulación (admin) ----

export type PedidoResumen = {
  id_pedido: number;
  id_sucursal: number;
  id_turno: number;
  id_usuario: number;
  username: string | null;
  tipo_pedido: string;
  estado: string | null;
  nombre_cliente: string | null;
  telefono_cliente: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  observacion: string | null;
  fecha_creacion: string;
  pagos_monto?: number;
  pagos_vuelto?: number;
};

export type PedidoDetalleItem = {
  id_item: number;
  id_producto: number;
  cantidad: number;
  precio: number;
  descuento: number;
  nombre_producto: string | null;
  modificadores: { nombre: string; precio_adicional: number }[];
};

export type PedidoPago = {
  id_pago: number;
  metodo_pago: string;
  monto: number;
  monto_recibido: number | null;
  vuelto: number | null;
  referencia: string | null;
  fecha_pago: string;
};

export type PedidoDetalle = PedidoResumen & {
  sucursal: string | null;
  items: PedidoDetalleItem[];
  pagos: PedidoPago[];
};

export type PedidosFiltro = {
  id_turno?: number;
  estado?: string;
  desde?: string;
  hasta?: string;
  limite?: number;
};

export const listarPedidos = (token: string | null, filtro: PedidosFiltro = {}) => {
  const qs = new URLSearchParams();
  if (filtro.id_turno != null) qs.set("id_turno", String(filtro.id_turno));
  if (filtro.estado) qs.set("estado", filtro.estado);
  if (filtro.desde) qs.set("desde", filtro.desde);
  if (filtro.hasta) qs.set("hasta", filtro.hasta);
  if (filtro.limite) qs.set("limite", String(filtro.limite));
  const q = qs.toString();
  return apiFetch<PedidoResumen[]>(`/pedidos/${q ? "?" + q : ""}`, { token });
};

export const obtenerPedido = (id: number, token: string | null) =>
  apiFetch<PedidoDetalle>(`/pedidos/${id}`, { token });

export const anularPedido = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/pedidos/${id}/anular`, { method: "POST", token });
