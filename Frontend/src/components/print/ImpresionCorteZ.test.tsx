import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CorteZ } from "./ImpresionCorteZ";
import type { ResumenTurno } from "../../api/caja";

const base: ResumenTurno = {
  turno: {
    id_turno: 7,
    id_caja: 1,
    id_usuario: 3,
    monto_inicial: 10000,
    fecha_apertura: "2026-06-15T13:00:00Z",
    fecha_cierre: "2026-06-15T23:00:00Z",
    efectivo_contado: 45000,
    efectivo_esperado: 44000,
    diferencia: 1000,
    estado: "CERRADO",
  },
  pagos: [
    { metodo_pago: "EFECTIVO", total: 34000 },
    { metodo_pago: "DEBITO", total: 20000 },
  ],
  pedidos_cantidad: 12,
  pedidos_monto: 54000,
  anulaciones: [],
  movimientos: [],
  movimientos_ingresos: 0,
  movimientos_retiros: 0,
  movimientos_gastos: 0,
  devoluciones: 0,
  monto_inicial: 10000,
  efectivo_ventas: 34000,
  efectivo_esperado: 44000,
};

describe("CorteZ", () => {
  it("muestra el título CORTE Z y el número de turno cuando está cerrado", () => {
    render(<CorteZ resumen={base} emisor={null} meta={{ caja: "Caja 1", cajero: "Ana" }} />);
    expect(screen.getByText("CORTE Z")).toBeInTheDocument();
    expect(screen.getByText("Turno #7")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("muestra la diferencia de arqueo", () => {
    render(<CorteZ resumen={base} emisor={null} />);
    expect(screen.getByText("Diferencia")).toBeInTheDocument();
    expect(screen.getByText("+$ 1.000")).toBeInTheDocument();
  });

  it("turno abierto -> CORTE X y sin bloque de diferencia", () => {
    const abierto: ResumenTurno = {
      ...base,
      turno: { ...base.turno, estado: "ABIERTO", fecha_cierre: null, efectivo_contado: null, diferencia: null },
    };
    render(<CorteZ resumen={abierto} emisor={null} />);
    expect(screen.getByText("CORTE X (turno abierto)")).toBeInTheDocument();
    expect(screen.queryByText("Diferencia")).not.toBeInTheDocument();
  });
});
