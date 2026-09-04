import { apiFetch } from "./client";

export type Caja = {
  id_caja: number;
  nombre: string;
  id_sucursal: number;
  sucursal: string | null;
  activo?: boolean;
};

export type CajaInput = {
  nombre: string;
  id_sucursal: number;
};

export type Turno = {
  id_turno: number;
  id_caja: number;
  id_usuario: number;
  monto_inicial: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_contado: number | null;
  efectivo_esperado: number | null;
  diferencia: number | null;
  estado: "ABIERTO" | "CERRADO";
};

export type MovimientoCaja = {
  id_movimiento: number;
  tipo_movimiento: "RETIRO" | "INGRESO" | "GASTO";
  monto: number;
  motivo: string;
  fecha_movimiento: string;
};

export type PagoResumen = { metodo_pago: string; total: number };

export type ResumenTurno = {
  turno: Turno;
  pagos: PagoResumen[];
  pedidos_cantidad: number;
  pedidos_monto: number;
  movimientos: MovimientoCaja[];
  movimientos_ingresos: number;
  movimientos_retiros: number;
  movimientos_gastos: number;
  monto_inicial: number;
  efectivo_ventas: number;
  efectivo_esperado: number;
};

export type TurnoHistorial = Turno & { caja: string | null; username: string | null };

export const listarCajas = (token: string | null, incluirInactivas = false) =>
  apiFetch<Caja[]>(
    `/caja/cajas${incluirInactivas ? "?incluir_inactivas=true" : ""}`,
    { token }
  );

export const crearCaja = (input: CajaInput, token: string | null) =>
  apiFetch<Caja>("/caja/cajas", { method: "POST", body: input, token });

export const actualizarCaja = (id: number, input: CajaInput, token: string | null) =>
  apiFetch<Caja>(`/caja/cajas/${id}`, { method: "PUT", body: input, token });

export const eliminarCaja = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/caja/cajas/${id}`, { method: "DELETE", token });

export const reactivarCaja = (id: number, token: string | null) =>
  apiFetch<Caja>(`/caja/cajas/${id}/reactivar`, { method: "POST", token });

export const borrarCajaDefinitivo = (id: number, token: string | null) =>
  apiFetch<{ mensaje: string }>(`/caja/cajas/${id}/definitivo`, { method: "DELETE", token });

export const turnoActual = (token: string | null) =>
  apiFetch<ResumenTurno | null>("/caja/turno-actual", { token });

export const abrirTurno = (id_caja: number, monto_inicial: number, token: string | null) =>
  apiFetch<{ id_turno: number }>("/caja/turnos", {
    method: "POST",
    body: { id_caja, monto_inicial },
    token,
  });

export const registrarMovimientoCaja = (
  id_turno: number,
  input: { tipo_movimiento: "RETIRO" | "INGRESO" | "GASTO"; monto: number; motivo: string },
  token: string | null
) =>
  apiFetch<{ mensaje: string }>(`/caja/turnos/${id_turno}/movimientos`, {
    method: "POST",
    body: input,
    token,
  });

export const cerrarTurno = (id_turno: number, efectivo_contado: number, token: string | null) =>
  apiFetch<{ efectivo_esperado: number; efectivo_contado: number; diferencia: number }>(
    `/caja/turnos/${id_turno}/cerrar`,
    { method: "POST", body: { efectivo_contado }, token }
  );

export const corteTurno = (id_turno: number, token: string | null) =>
  apiFetch<ResumenTurno>(`/caja/turnos/${id_turno}/corte`, { token });

export const listarTurnos = (token: string | null) =>
  apiFetch<TurnoHistorial[]>("/caja/turnos", { token });
