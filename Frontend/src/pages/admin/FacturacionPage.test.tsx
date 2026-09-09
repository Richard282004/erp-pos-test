import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ConfigDTE } from "../../api/dte";

const cfg: ConfigDTE = {
  activado: false,
  proveedor: null,
  ambiente: "certificacion",
  api_url: null,
  api_token: null,
  api_token_configurado: false,
  rut_emisor: null,
  razon_social: null,
  giro: null,
  codigo_actividad: null,
  direccion_casa_matriz: null,
  comuna_casa_matriz: null,
  tipo_documento_default: 39,
  resolucion_numero: null,
  resolucion_fecha: null,
  fecha_actualizacion: null,
};

const obtenerConfigDte = vi.fn(() => Promise.resolve(cfg));

vi.mock("../../api/dte", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/dte")>()),
  obtenerConfigDte: () => obtenerConfigDte(),
  guardarConfigDte: vi.fn(),
  probarConfigDte: vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ accessToken: "t" }),
}));

import { FacturacionPage } from "./FacturacionPage";

describe("FacturacionPage", () => {
  beforeEach(() => obtenerConfigDte.mockClear());

  it("avisa que la emisión no está activa y muestra el formulario", async () => {
    render(<FacturacionPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/emisión de documentos tributarios todavía no está activa/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Activar facturación electrónica")).toBeInTheDocument();
    expect(screen.getByText("Datos del emisor")).toBeInTheDocument();
    expect(obtenerConfigDte).toHaveBeenCalled();
  });
});
