import { describe, it, expect, vi, afterEach } from "vitest";
import { fechaNegocioISO, haceDiasISO, primerDiaDelMesISO } from "./fecha";

afterEach(() => {
  vi.useRealTimers();
});

describe("fechaNegocioISO", () => {
  it("formatea YYYY-MM-DD", () => {
    expect(fechaNegocioISO(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });

  it("una venta de las 23:00 en Chile sigue siendo ese día (no el siguiente en UTC)", () => {
    // 2026-06-15 23:30 hora Chile (UTC-4) == 2026-06-16 03:30 UTC
    expect(fechaNegocioISO(new Date("2026-06-16T03:30:00Z"))).toBe("2026-06-15");
  });
});

describe("haceDiasISO / primerDiaDelMesISO", () => {
  it("haceDiasISO(7) resta 7 días", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T15:00:00Z"));
    expect(haceDiasISO(7)).toBe("2026-06-08");
  });

  it("primerDiaDelMesISO devuelve el día 01", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T15:00:00Z"));
    expect(primerDiaDelMesISO()).toBe("2026-06-01");
  });
});
