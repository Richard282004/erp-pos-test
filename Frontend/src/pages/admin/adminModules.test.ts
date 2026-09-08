import { describe, it, expect } from "vitest";
import { modulosVisibles, gruposVisibles } from "./adminModules";
import { ROL_ADMIN, ROL_SUPERVISOR, ROL_REPORTES } from "../../api/auth";

const u = (id_rol: number) => ({ id_rol });

describe("visibilidad de módulos por rol", () => {
  it("admin ve todo, incluidos los soloAdmin", () => {
    const paths = modulosVisibles(u(ROL_ADMIN)).map((m) => m.path);
    expect(paths).toContain("usuarios");
    expect(paths).toContain("mantenimiento");
  });

  it("supervisor no ve los soloAdmin", () => {
    const paths = modulosVisibles(u(ROL_SUPERVISOR)).map((m) => m.path);
    expect(paths).toContain("categorias");
    expect(paths).not.toContain("usuarios");
    expect(paths).not.toContain("negocio");
  });

  it("reportes ve solo dashboard, pedidos y turnos", () => {
    const paths = modulosVisibles(u(ROL_REPORTES)).map((m) => m.path).sort();
    expect(paths).toEqual(["dashboard", "pedidos", "turnos"]);
  });

  it("gruposVisibles no deja grupos vacíos para reportes", () => {
    const grupos = gruposVisibles(u(ROL_REPORTES));
    expect(grupos.every((g) => g.modules.length > 0)).toBe(true);
    expect(grupos.map((g) => g.label)).toEqual(["Operación"]);
  });
});
