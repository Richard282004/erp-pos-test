import { describe, it, expect } from "vitest";
import {
  ROL_ADMIN,
  ROL_SUPERVISOR,
  ROL_CAJERO,
  ROL_REPORTES,
  esAdmin,
  puedeEntrarAdmin,
  puedeOperarPos,
  soloReportes,
  puedeGestionarProductos,
  nombreRol,
  ROLES,
} from "./auth";

const u = (id_rol: number) => ({ id_rol });

describe("helpers de rol", () => {
  it("esAdmin solo para admin", () => {
    expect(esAdmin(u(ROL_ADMIN))).toBe(true);
    expect(esAdmin(u(ROL_SUPERVISOR))).toBe(false);
    expect(esAdmin(null)).toBe(false);
  });

  it("puedeEntrarAdmin: admin, supervisor y reportes", () => {
    expect(puedeEntrarAdmin(u(ROL_ADMIN))).toBe(true);
    expect(puedeEntrarAdmin(u(ROL_SUPERVISOR))).toBe(true);
    expect(puedeEntrarAdmin(u(ROL_REPORTES))).toBe(true);
    expect(puedeEntrarAdmin(u(ROL_CAJERO))).toBe(false);
  });

  it("puedeOperarPos: NO reportes", () => {
    expect(puedeOperarPos(u(ROL_CAJERO))).toBe(true);
    expect(puedeOperarPos(u(ROL_ADMIN))).toBe(true);
    expect(puedeOperarPos(u(ROL_REPORTES))).toBe(false);
  });

  it("soloReportes: solo el rol 4", () => {
    expect(soloReportes(u(ROL_REPORTES))).toBe(true);
    expect(soloReportes(u(ROL_ADMIN))).toBe(false);
  });

  it("puedeGestionarProductos: admin y supervisor, no reportes ni cajero", () => {
    expect(puedeGestionarProductos(u(ROL_SUPERVISOR))).toBe(true);
    expect(puedeGestionarProductos(u(ROL_REPORTES))).toBe(false);
    expect(puedeGestionarProductos(u(ROL_CAJERO))).toBe(false);
  });

  it("nombreRol", () => {
    expect(nombreRol(u(ROL_REPORTES))).toBe("Reportes");
    expect(nombreRol(null)).toBe("Usuario");
  });

  it("ROLES tiene los 4 roles", () => {
    expect(ROLES.map((r) => r.id_rol)).toEqual([
      ROL_ADMIN,
      ROL_SUPERVISOR,
      ROL_CAJERO,
      ROL_REPORTES,
    ]);
  });
});
