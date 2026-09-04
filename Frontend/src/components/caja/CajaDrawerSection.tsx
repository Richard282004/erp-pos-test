import { useState } from "react";
import {
  registrarMovimientoCaja,
  cerrarTurno,
  type ResumenTurno,
} from "../../api/caja";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function CajaDrawerSection({
  resumen,
  onCambio,
}: {
  resumen: ResumenTurno;
  onCambio: () => void;
}) {
  const { accessToken } = useAuth();
  const idTurno = resumen.turno.id_turno;

  const [modal, setModal] = useState<null | "movimiento" | "cerrar">(null);

  const [movTipo, setMovTipo] = useState<"RETIRO" | "INGRESO" | "GASTO">("RETIRO");
  const [movMonto, setMovMonto] = useState(0);
  const [movMotivo, setMovMotivo] = useState("");

  const [contado, setContado] = useState(0);
  const [cierre, setCierre] = useState<{ esperado: number; contado: number; diferencia: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrarModal = () => {
    setModal(null);
    setError(null);
    setCierre(null);
    setMovMonto(0);
    setMovMotivo("");
    setContado(0);
  };

  return (
    <>
      <div className="caja-drawer">
        <div className="caja-drawer-head">
          <strong>Caja abierta</strong>
          <span>Turno #{idTurno}</span>
        </div>
        <dl>
          <div><dt>Ventas</dt><dd>{cf.format(resumen.pedidos_monto)} · {resumen.pedidos_cantidad} pedidos</dd></div>
          <div><dt>Efectivo esperado</dt><dd>{cf.format(resumen.efectivo_esperado)}</dd></div>
        </dl>
        <div className="caja-drawer-btns">
          <button onClick={() => setModal("movimiento")}>Movimiento</button>
          <button onClick={() => setModal("cerrar")}>Cerrar caja</button>
        </div>
      </div>

      {modal === "movimiento" && (
        <div className="admin-modal" onClick={cerrarModal}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Movimiento de caja</h3>
            <label>
              Tipo
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as typeof movTipo)}>
                <option value="RETIRO">Retiro (sale plata de la caja)</option>
                <option value="INGRESO">Ingreso (entra plata a la caja)</option>
                <option value="GASTO">Gasto (compra / pago desde la caja)</option>
              </select>
            </label>
            <label>
              Monto
              <input type="number"
            onFocus={(e) => e.target.select()} min={0} step="any" value={movMonto} onChange={(e) => setMovMonto(Number(e.target.value))} />
            </label>
            <label>
              Motivo
              <input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Ej: retiro a caja fuerte" />
            </label>
            <div>
              <button
                disabled={busy || movMonto <= 0 || !movMotivo}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await registrarMovimientoCaja(idTurno, { tipo_movimiento: movTipo, monto: movMonto, motivo: movMotivo }, accessToken);
                    onCambio();
                    cerrarModal();
                  } catch (err) {
                    setError(mensajeError(err, "Error registrando el movimiento"));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Registrando…" : "Registrar"}
              </button>
              <button onClick={cerrarModal} style={{ marginLeft: 8 }}>Cancelar</button>
            </div>
            {error && <div className="error-productos">{error}</div>}
          </div>
        </div>
      )}

      {modal === "cerrar" && (
        <div className="admin-modal" onClick={cerrarModal}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Cerrar caja — arqueo</h3>

            <div className="caja-arqueo">
              {resumen.pagos.map((p) => (
                <div key={p.metodo_pago}><span>{p.metodo_pago}</span><strong>{cf.format(p.total)}</strong></div>
              ))}
              <div><span>Monto inicial</span><strong>{cf.format(resumen.monto_inicial)}</strong></div>
              {resumen.movimientos_ingresos > 0 && <div><span>Ingresos</span><strong>+{cf.format(resumen.movimientos_ingresos)}</strong></div>}
              {resumen.movimientos_retiros > 0 && <div><span>Retiros</span><strong>−{cf.format(resumen.movimientos_retiros)}</strong></div>}
              {resumen.movimientos_gastos > 0 && <div><span>Gastos</span><strong>−{cf.format(resumen.movimientos_gastos)}</strong></div>}
              <div className="caja-arqueo-total"><span>Efectivo esperado</span><strong>{cf.format(resumen.efectivo_esperado)}</strong></div>
            </div>

            {!cierre ? (
              <>
                <label>
                  Efectivo contado en la caja
                  <input type="number"
            onFocus={(e) => e.target.select()} min={0} step="any" value={contado} onChange={(e) => setContado(Number(e.target.value))} />
                </label>
                <div>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setError(null);
                      setBusy(true);
                      try {
                        const r = await cerrarTurno(idTurno, contado, accessToken);
                        setCierre({ esperado: r.efectivo_esperado, contado: r.efectivo_contado, diferencia: r.diferencia });
                      } catch (err) {
                        setError(mensajeError(err, "Error cerrando la caja"));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Cerrando…" : "Cerrar caja"}
                  </button>
                  <button onClick={cerrarModal} style={{ marginLeft: 8 }}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div className="caja-arqueo">
                  <div><span>Esperado</span><strong>{cf.format(cierre.esperado)}</strong></div>
                  <div><span>Contado</span><strong>{cf.format(cierre.contado)}</strong></div>
                  <div className={"caja-arqueo-total " + (cierre.diferencia === 0 ? "ok" : "off")}>
                    <span>Diferencia</span>
                    <strong>{cierre.diferencia > 0 ? "+" : ""}{cf.format(cierre.diferencia)}</strong>
                  </div>
                </div>
                <button onClick={() => { onCambio(); cerrarModal(); }}>Listo</button>
              </>
            )}
            {error && <div className="error-productos">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
