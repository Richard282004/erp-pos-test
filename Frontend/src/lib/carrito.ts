import type { Producto } from "../api/productos";

export type ModCarrito = {
  id_modificador: number;
  nombre: string;
  precio_adicional: number;
  /** Cantidad del modificador (ej. "Extra tocino ×2"). Los "sin ..." van en 1. */
  cantidad: number;
  tipo?: "AGREGAR" | "QUITAR";
};

export type ItemCarrito = Producto & {
  lineId: string;
  cantidad: number;
  descuento: number;
  modificadores: ModCarrito[];
};

/** Precio de una unidad de la línea: base del producto + modificadores × su cantidad. */
export function precioUnitario(item: ItemCarrito): number {
  return (
    item.precio +
    item.modificadores.reduce((s, m) => s + m.precio_adicional * m.cantidad, 0)
  );
}
