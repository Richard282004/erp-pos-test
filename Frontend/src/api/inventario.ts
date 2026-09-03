import { apiFetch } from "./client";

export type CompraItemInput = {
  id_insumo: number;
  cantidad_compra: number;
  unidad_compra: string;
  costo_total: number;
};

export type CompraInput = {
  proveedor?: string | null;
  nota?: string | null;
  items: CompraItemInput[];
};

export type CompraItem = {
  id_insumo: number;
  insumo: string;
  cantidad_compra: number;
  unidad_compra: string;
  cantidad_base: number;
  costo_total: number;
};

export type Compra = {
  id_compra: number;
  fecha: string;
  proveedor: string | null;
  nota: string | null;
  total: number;
  username: string | null;
  items: CompraItem[];
};

export type TipoMovimiento = "COMPRA" | "CONSUMO" | "MERMA" | "AJUSTE";

export type Movimiento = {
  id_movimiento: number;
  id_insumo: number;
  insumo: string;
  tipo: TipoMovimiento;
  cantidad: number;
  costo_unitario: number;
  fecha: string;
  nota: string | null;
  username: string | null;
};

export type MovimientoInput = {
  id_insumo: number;
  tipo: "AJUSTE" | "MERMA";
  cantidad: number;
  nota?: string | null;
};

export type AlertaStock = {
  id_insumo: number;
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
};

export const registrarCompra = (input: CompraInput, token: string | null) =>
  apiFetch<{ id_compra: number; total: number }>("/inventario/compras", {
    method: "POST",
    body: input,
    token,
  });

export const listarCompras = (token: string | null) =>
  apiFetch<Compra[]>("/inventario/compras", { token });

export const registrarMovimiento = (input: MovimientoInput, token: string | null) =>
  apiFetch<{ mensaje: string; stock_actual: number }>("/inventario/movimientos", {
    method: "POST",
    body: input,
    token,
  });

export const listarMovimientos = (token: string | null, idInsumo?: number) =>
  apiFetch<Movimiento[]>(
    `/inventario/movimientos${idInsumo ? `?id_insumo=${idInsumo}` : ""}`,
    { token }
  );

export const listarAlertas = (token: string | null) =>
  apiFetch<AlertaStock[]>("/inventario/alertas", { token });
