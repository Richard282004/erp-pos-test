import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, descargarReporte, type DashboardData } from "../../api/estadisticas";
import { listarInsumos, type Insumo } from "../../api/insumos";
import { useAuth } from "../../context/useAuth";
import { useRecurso } from "../../hooks/useRecurso";
import { mensajeError } from "../../lib/errores";
import { fechaNegocioISO, haceDiasISO, primerDiaDelMesISO } from "../../lib/fecha";

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const pf = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 0 });
const df = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });

type Preset = "hoy" | "7d" | "mes" | "custom";

function rangoDePreset(p: Preset): { desde: string; hasta: string } {
  const hoy = fechaNegocioISO();
  if (p === "hoy") return { desde: hoy, hasta: hoy };
  if (p === "7d") return { desde: haceDiasISO(6), hasta: hoy };
  return { desde: primerDiaDelMesISO(), hasta: hoy };
}

function rangoLegible(preset: Preset, desde: string, hasta: string): string {
  if (preset === "hoy") return "hoy";
  if (preset === "7d") return "los últimos 7 días";
  const d = new Date(desde + "T12:00");
  const h = new Date(hasta + "T12:00");
  if (desde === hasta) return `el ${df.format(d)}`;
  return `del ${d.getDate()} al ${df.format(h)}`;
}

const DIA_CORTO = ["D", "L", "M", "M", "J", "V", "S"];

/** Divide la cifra en símbolo + dígitos para poder darles distinto peso. */
function partirMoneda(valor: number): [string, string] {
  const s = cf.format(valor);
  const m = s.match(/^([^\d-]*)(.*)$/);
  return m ? [m[1].trim(), m[2].trim()] : ["$", String(Math.round(valor))];
}

function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const max = Math.max(1, ...valores);
  const w = 104;
  const h = 26;
  const paso = w / (valores.length - 1);
  const pts = valores
    .map((v, i) => `${(i * paso).toFixed(1)},${(h - (v / max) * (h - 3) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="dash-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardPage() {
  const { accessToken } = useAuth();

  const [preset, setPreset] = useState<Preset>("hoy");
  const [desde, setDesde] = useState(() => rangoDePreset("hoy").desde);
  const [hasta, setHasta] = useState(() => rangoDePreset("hoy").hasta);

  const [stockBajo, setStockBajo] = useState<Insumo[]>([]);
  const [descargando, setDescargando] = useState<"ventas" | "productos" | null>(null);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  const descargar = async (tipo: "ventas" | "productos") => {
    setErrorExport(null);
    setDescargando(tipo);
    try {
      await descargarReporte(tipo, accessToken, desde, hasta);
    } catch (err) {
      setErrorExport(mensajeError(err, "No se pudo descargar el reporte"));
    } finally {
      setDescargando(null);
    }
  };

  useEffect(() => {
    let ignore = false;
    listarInsumos(accessToken)
      .then((insumos) => {
        if (!ignore) setStockBajo(insumos.filter((i) => i.stock_actual < i.stock_minimo));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = rangoDePreset(p);
      setDesde(r.desde);
      setHasta(r.hasta);
    }
  };

  const cargador = useCallback(
    () => getDashboard(accessToken, desde, hasta),
    [accessToken, desde, hasta],
  );
  const {
    datos: data,
    loading,
    error,
    refetch: cargar,
  } = useRecurso<DashboardData | null>(cargador, "Error cargando el dashboard", null);

  const chart = useMemo(() => {
    if (!data || data.por_dia.length === 0) return null;
    const max = Math.max(1, ...data.por_dia.map((d) => d.ventas));
    const prom =
      data.por_dia.reduce((s, d) => s + d.ventas, 0) / data.por_dia.length;
    return {
      max,
      prom,
      promPct: (prom / max) * 100,
      dias: data.por_dia.map((d) => {
        const fecha = new Date(d.dia + "T12:00");
        return {
          ...d,
          fecha,
          finde: fecha.getDay() === 0 || fecha.getDay() === 6,
          alturaPct: Math.max(2, (d.ventas / max) * 100),
          esPico: d.ventas === max && d.ventas > 0,
        };
      }),
    };
  }, [data]);

  return (
    <div className="admin-modulo">
      <div className="dash-encabezado">
        <h2>Ventas</h2>
        <div className="dash-controles">
          <div className="dash-presets">
            {(["hoy", "7d", "mes", "custom"] as Preset[]).map((p) => (
              <button
                key={p}
                className={"dash-preset" + (preset === p ? " activo" : "")}
                onClick={() => aplicarPreset(p)}
              >
                {p === "hoy" ? "Hoy" : p === "7d" ? "7 días" : p === "mes" ? "Este mes" : "Rango"}
              </button>
            ))}
          </div>
          <div className="dash-export">
            <button
              disabled={descargando !== null}
              onClick={() => descargar("ventas")}
            >
              {descargando === "ventas" ? "Generando…" : "Exportar ventas"}
            </button>
            <button
              disabled={descargando !== null}
              onClick={() => descargar("productos")}
            >
              {descargando === "productos" ? "Generando…" : "Exportar productos"}
            </button>
          </div>
        </div>
      </div>

      {preset === "custom" && (
        <div className="dash-fechas">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <span>—</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <button onClick={cargar}>Ver</button>
        </div>
      )}

      {errorExport && <div className="dash-aviso dash-aviso--error" role="alert">{errorExport}</div>}

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : data ? (
        <>
          <div className="dash-hero">
            <span className="dash-hero-label">Ventas {rangoLegible(preset, desde, hasta)}</span>
            <div className="dash-hero-fila">
              <strong className="dash-hero-cifra">
                {(() => {
                  const [sig, num] = partirMoneda(data.resumen.ventas);
                  return (
                    <>
                      <span className="dash-hero-signo">{sig}</span>
                      {num}
                    </>
                  );
                })()}
              </strong>
              {data.por_dia.length > 1 && (
                <Sparkline valores={data.por_dia.map((d) => d.ventas)} />
              )}
            </div>
            <p className="dash-hero-frase">
              {data.resumen.pedidos} pedido{data.resumen.pedidos === 1 ? "" : "s"}, ticket
              promedio de {cf.format(data.resumen.ticket_promedio)}
              {data.resumen.ventas > 0 && data.resumen.costo > 0 && (
                <>, {pf.format(data.resumen.margen)} de ganancia</>
              )}
              .
            </p>
          </div>

          <section className="dash-seccion">
            <h3>Ventas por día</h3>
            {!chart ? (
              <p className="admin-stub">Sin ventas en este período.</p>
            ) : (
              <div className="dash-chart">
                <div className="dash-chart-barras">
                  {chart.dias.length > 2 && (
                    <div
                      className="dash-chart-prom"
                      style={{ top: `calc(1.1em + ${(170 * (1 - chart.promPct / 100)).toFixed(1)}px)` }}
                    >
                      <span>promedio {cf.format(chart.prom)}</span>
                    </div>
                  )}
                  {chart.dias.map((d) => (
                    <div
                      key={d.dia}
                      className={"dash-col" + (d.finde ? " es-finde" : "") + (d.esPico ? " es-pico" : "")}
                    >
                      <span className="dash-col-valor">{d.esPico ? cf.format(d.ventas) : ""}</span>
                      <div className="dash-col-pista">
                        <div
                          className="dash-col-fill"
                          style={{ height: `${d.alturaPct}%` }}
                          title={`${d.fecha.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} — ${cf.format(d.ventas)} · ${d.pedidos} pedidos`}
                        />
                      </div>
                      <span className="dash-col-dia">
                        {DIA_CORTO[d.fecha.getDay()]}
                        <em>{d.fecha.getDate()}</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="dash-cols">
            <section className="dash-seccion">
              <h3>Medios de pago</h3>
              <table className="admin-tabla dash-tabla">
                <thead><tr><th></th><th>Ped.</th><th>Monto</th></tr></thead>
                <tbody>
                  {data.por_metodo.map((m) => (
                    <tr key={m.metodo_pago}>
                      <td>{m.metodo_pago}</td>
                      <td>{m.pedidos}</td>
                      <td>{cf.format(m.monto)}</td>
                    </tr>
                  ))}
                  {data.por_metodo.length === 0 && (
                    <tr><td colSpan={3} className="receta-vacia">Sin ventas.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="dash-seccion">
              <h3>Tipos de pedido</h3>
              <table className="admin-tabla dash-tabla">
                <thead><tr><th></th><th>Ped.</th><th>Monto</th></tr></thead>
                <tbody>
                  {data.por_tipo.map((t) => (
                    <tr key={t.tipo_pedido}>
                      <td>{t.tipo_pedido}</td>
                      <td>{t.pedidos}</td>
                      <td>{cf.format(t.monto)}</td>
                    </tr>
                  ))}
                  {data.por_tipo.length === 0 && (
                    <tr><td colSpan={3} className="receta-vacia">Sin ventas.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="dash-seccion">
              <h3>Más vendidos</h3>
              <table className="admin-tabla dash-tabla">
                <thead><tr><th></th><th>Cant.</th><th>Monto</th></tr></thead>
                <tbody>
                  {data.top_productos.slice(0, 8).map((t, i) => (
                    <tr key={i}>
                      <td><span className="dash-rank">{i + 1}</span>{t.nombre}</td>
                      <td>{t.cantidad}</td>
                      <td>{cf.format(t.monto)}</td>
                    </tr>
                  ))}
                  {data.top_productos.length === 0 && (
                    <tr><td colSpan={3} className="receta-vacia">Sin ventas.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>

          {stockBajo.length > 0 && (
            <p className="dash-nota-stock" role="status">
              {stockBajo.length} insumo{stockBajo.length > 1 ? "s" : ""} bajo el mínimo
              {" ("}
              {stockBajo.slice(0, 3).map((i) => i.nombre).join(", ")}
              {stockBajo.length > 3 ? "…" : ""}
              {"). "}
              <Link to="/admin/insumos">Ver insumos</Link>
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
