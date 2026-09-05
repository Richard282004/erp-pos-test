import type { Producto } from "../api/productos";

export type ModCarrito = {
  id_modificador: number;
  nombre: string;
  precio_adicional: number;
};

export type ItemCarrito = Producto & {
  lineId: string;
  cantidad: number;
  descuento: number;
  modificadores: ModCarrito[];
};

/** Precio de una unidad de la línea: base del producto + modificadores. */
export function precioUnitario(item: ItemCarrito): number {
  return item.precio + item.modificadores.reduce((s, m) => s + m.precio_adicional, 0);
}
