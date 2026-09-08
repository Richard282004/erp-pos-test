import { describe, it, expect } from "vitest";
import { precioUnitario, type ItemCarrito } from "./carrito";

function item(precio: number, mods: number[] = []): ItemCarrito {
  return {
    id_producto: 1,
    nombre: "X",
    precio,
    activo: true,
    lineId: "l1",
    cantidad: 1,
    descuento: 0,
    modificadores: mods.map((p, i) => ({ id_modificador: i, nombre: "m", precio_adicional: p })),
  } as unknown as ItemCarrito;
}

describe("precioUnitario", () => {
  it("sin modificadores es el precio base", () => {
    expect(precioUnitario(item(2990))).toBe(2990);
  });

  it("suma los modificadores", () => {
    expect(precioUnitario(item(2990, [500, 300]))).toBe(3790);
  });

  it("modificadores en 0 no cambian el precio", () => {
    expect(precioUnitario(item(1000, [0, 0]))).toBe(1000);
  });
});
