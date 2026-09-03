import { useEffect, useState } from "react";
import {
  listarTurnos,
  corteTurno,
  type TurnoHistorial,
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

function fecha(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function TurnosPage() {
  const { accessToken } = useAuth();
  const [turnos, setTurnos] = useState<TurnoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [corte, setCorte] = useState<ResumenTurno | null>(null);
  const [corteLoading, setCorteLoading] = useState(false);

  useEffect(() => {
    listarTurnos(accessToken)
      .then(setTurnos)
      .catch((err) => setError(mensajeError(err, "Error cargando turnos")))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const verCorte = (id: number) => {
    setCorteLoading(true);
    setCorte(null);
    corteTurno(id, accessToken)
      .then(setCorte)
      .catch((err) => setError(mensajeError(err, "Error cargando el corte")))
      .finally(() => setCorteLoading(false));
  };

  return (
    <div className="admin-modulo">
      <h2>Turnos de caja</h2>

      {loading ? (
        <div className="cargando">Cargando turnos…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : turnos.length === 0 ? (
        <p className="admin-stub">Todavía no se abrió ningún turno.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Caja</th>
              <th>Cajero</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th>Diferencia</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id_turno}>
                <td>{t.id_turno}</td>
                <td>{t.caja ?? "—"}</td>
                <td>{t.username ?? "—"}</td>
                <td>{fecha(t.fecha_apertura)}</td>
                <td>{fecha(t.fecha_cierre)}</td>
                <td className={
                  t.diferencia == null ? undefined
                    : Number(t.diferencia) === 0 ? "admin-estado-activo"
                    : "admin-estado-inactivo"
                }>
                  {t.diferencia == null ? "—" : (Number(t.diferencia) > 0 ? "+" : "") + cf.format(Number(t.diferencia))}
                </td>
                <td className={t.estado === "ABIERTO" ? "admin-estado-activo" : undefined}>{t.estado}</td>
                <td className="admin-acciones">
                  <button onClick={() => verCorte(t.id_turno)}>Corte Z</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(corteLoading || corte) && (
        <div className="admin-modal" onClick={() => setCorte(null)}>
          <div className="admin-modal-form corte-modal" onClick={(e) => e.stopPropagation()}>
            {corteLoading || !corte ? (
              <div className="cargando">Cargando…</div>
            ) : (
              <>
                <h3>Corte Z — Turno #{corte.turno.id_turno}</h3>

                <div className="corte-seccion">
                  <h4>Ventas por medio de pago</h4>
                  {corte.pagos.length === 0 ? (
                    <p className="admin-nota-modal">Sin ventas.</p>
                  ) : (
                    corte.pagos.map((p) => (
                      <div key={p.metodo_pago} className="corte-linea">
                        <span>{p.metodo_pago}</span><strong>{cf.format(p.total)}</strong>
                      </div>
                    ))
                  )}
                  <div className="corte-linea corte-total">
                    <span>{corte.pedidos_cantidad} pedidos</span>
                    <strong>{cf.format(corte.pedidos_monto)}</strong>
                  </div>
                </div>

                <div className="corte-seccion">
                  <h4>Efectivo</h4>
                  <div className="corte-linea"><span>Monto inicial</span><strong>{cf.format(corte.monto_inicial)}</strong></div>
                  <div className="corte-linea"><span>Ventas en efectivo</span><strong>+{cf.format(corte.efectivo_ventas)}</strong></div>
                  {corte.movimientos_ingresos > 0 && <div className="corte-linea"><span>Ingresos</span><strong>+{cf.format(corte.movimientos_ingresos)}</strong></div>}
                  {corte.movimientos_retiros > 0 && <div className="corte-linea"><span>Retiros</span><strong>−{cf.format(corte.movimientos_retiros)}</strong></div>}
                  {corte.movimientos_gastos > 0 && <div className="corte-linea"><span>Gastos</span><strong>−{cf.format(corte.movimientos_gastos)}</strong></div>}
                  <div className="corte-linea corte-total"><span>Efectivo esperado</span><strong>{cf.format(corte.efectivo_esperado)}</strong></div>
                  {corte.turno.efectivo_contado != null && (
                    <>
                      <div className="corte-linea"><span>Efectivo contado</span><strong>{cf.format(Number(corte.turno.efectivo_contado))}</strong></div>
                      <div className={"corte-linea corte-total " + (Number(corte.turno.diferencia) === 0 ? "ok" : "off")}>
                        <span>Diferencia</span>
                        <strong>{Number(corte.turno.diferencia) > 0 ? "+" : ""}{cf.format(Number(corte.turno.diferencia))}</strong>
                      </div>
                    </>
                  )}
                </div>

                {corte.movimientos.length > 0 && (
                  <div className="corte-seccion">
                    <h4>Movimientos</h4>
                    {corte.movimientos.map((m) => (
                      <div key={m.id_movimiento} className="corte-linea">
                        <span>{m.tipo_movimiento} · {m.motivo}</span>
                        <strong>{cf.format(Number(m.monto))}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setCorte(null)}>Cerrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
