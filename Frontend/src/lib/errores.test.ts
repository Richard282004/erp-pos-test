import { describe, it, expect } from "vitest";
import { mensajeError } from "./errores";
import { ApiError } from "../api/client";

describe("mensajeError", () => {
  it("status 0 -> sin conexión", () => {
    expect(mensajeError(new ApiError("x", 0), "fb")).toMatch(/conexión/i);
  });

  it("401 -> sesión venció", () => {
    expect(mensajeError(new ApiError("x", 401), "fb")).toMatch(/sesión/i);
  });

  it("403 -> usa el mensaje del servidor", () => {
    expect(mensajeError(new ApiError("Tu rol no puede cobrar", 403), "fb")).toBe(
      "Tu rol no puede cobrar",
    );
  });

  it("500 -> mensaje genérico de servidor", () => {
    expect(mensajeError(new ApiError("stack feo", 500), "fb")).toMatch(/servidor/i);
  });

  it("Error común usa su message", () => {
    expect(mensajeError(new Error("boom"), "fb")).toBe("boom");
  });

  it("cosa desconocida cae al fallback", () => {
    expect(mensajeError({ raro: true }, "fb")).toBe("fb");
    expect(mensajeError(null, "fb")).toBe("fb");
  });
});
