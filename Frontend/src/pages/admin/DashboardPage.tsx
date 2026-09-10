import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, descargarReporte, type DashboardData } from "../../api/estadisticas";
import { listarInsumos, etiquetaUnidad, type Insumo } from "../../api/insumos";
import { useAuth } from "../../context/useAuth";
import { useRecurso } from "../../hooks/useRecurso";
import { mensajeError } from "../../lib/errores";
import { fechaNegocioISO, haceDiasISO, primerDiaDelMesISO } from "../../lib/fecha";

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const pf = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 });
const df = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });

type Preset = "hoy" | "7d" | "mes" | "custom";

function rangoDePreset(p: Preset): { desde: string; hasta: string } {
  const hoy = fechaNegocioISO();
  if (p === "hoy") return { desde: hoy, hasta: hoy };
  if (p === "7d") return { desde: haceDiasISO(6), hasta: hoy };
  return { desde: primerDiaDelMesISO(), hasta: hoy };
}

/** "Hoy" · "Últimos 7 días" · "Del 1 al 10 de septiembre" */
function rangoLegible(preset: Preset, desde: string, hasta: string): string {
  if (preset === "hoy") return "Hoy";
  if (preset === "7d") return "Últimos 7 días";
  const d = new Date(desde + "T12:00");
  const h = new Date(hasta + "T12:00");
  if (desde === hasta) return df.format(d);
  return `Del ${d.getDate()} al ${df.format(h)}`;
}

const DIA_CORTO = ["D", "L", "M", "M", "J", "V", "S"];

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

  const dias = useMemo(() => {
    if (!data) return [];
    const max = Math.max(1, ...data.por_dia.map((d) => d.ventas));
    return data.por_dia.map((d) => {
      const fecha = new Date(d.dia + "T12:00");
      const finde = fecha.getDay() === 0 || fecha.getDay() === 6;
      return {
        ...d,
        fecha,
        finde,
        alturaPct: Math.max(3, (d.ventas / max) * 100),
        esPico: d.ventas === max && d.ventas > 0,
      };
    });
  }, [data]);

  return (
    <div className="admin-modulo">
      <h2>Dashboard</h2>

      <div className="dash-rango">
        <div className="dash-presets">
          {(["hoy", "7d", "mes", "custom"] as Preset[]).map((p) => (
            <button
              key={p}
              className={"dash-preset" + (preset === p ? " activo" : "")}
              onClick={() => aplicarPreset(p)}
            >
              {p === "hoy" ? "Hoy" : p === "7d" ? "7 días" : p === "mes" ? "Este mes" : "Personalizado"}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="dash-fechas">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <span>—</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            <button onClick={cargar}>Ver</button>
          </div>
        )}

        <div className="dash-export">
          <button
            className="dash-export-btn"
            disabled={descargando !== null}
            onClick={() => descargar("ventas")}
          >
            {descargando === "ventas" ? "Generando…" : "Ventas (CSV)"}
          </button>
          <button
            className="dash-export-btn"
            disabled={descargando !== null}
            onClick={() => descargar("productos")}
          >
            {descargando === "productos" ? "Generando…" : "Productos (CSV)"}
          </button>
        </div>
      </div>

      {errorExport && <div className="dash-aviso dash-aviso--error" role="alert">{errorExport}</div>}

      {stockBajo.length > 0 && (
        <div className="dash-aviso" role="status">
          <strong>
            {stockBajo.length} insumo{stockBajo.length > 1 ? "s" : ""} con stock bajo
          </strong>
          <ul>
            {stockBajo.map((i) => (
              <li key={i.id_insumo}>
                {i.nombre}: {i.stock_actual} de {i.stock_minimo} {etiquetaUnidad(i.unidad)} mínimos
              </li>
            ))}
          </ul>
          <Link to="/admin/insumos">Ir a Insumos</Link>
        </div>
      )}

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : data ? (
        <>
          <div className="dash-hero">
            <span className="dash-hero-label">Ventas · {rangoLegible(preset, desde, hasta)}</span>
            <strong className="dash-hero-cifra">{cf.format(data.resumen.ventas)}</strong>
            <div className="dash-hero-apoyo">
              <span>
                <b>{data.resumen.pedidos}</b> pedido{data.resumen.pedidos === 1 ? "" : "s"}
              </span>
              <span>
                ticket <b>{cf.format(data.resumen.ticket_promedio)}</b>
              </span>
              <span>
                ganancia <b>{cf.format(data.resumen.ganancia_bruta)}</b>
                {data.resumen.ventas > 0 && <> ({pf.format(data.resumen.margen)})</>}
              </span>
              <span className="dash-hero-costo">costo {cf.format(data.resumen.costo)}</span>
            </div>
          </div>

          <section className="dash-seccion">
            <h3>Ventas por día</h3>
            {dias.length === 0 ? (
              <p className="admin-stub">Sin ventas en el rango.</p>
            ) : (
              <div className="dash-chart">
                <div className="dash-chart-barras">
                  {dias.map((d) => (
                    <div
                      key={d.dia}
                      className={
                        "dash-col" + (d.finde ? " es-finde" : "") + (d.esPico ? " es-pico" : "")
                      }
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
              <h3>Por medio de pago</h3>
              <table className="admin-tabla dash-tabla">
                <thead>
                  <tr><th>Método</th><th>Pedidos</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {data.por_metodo.map((m) => (
                    <tr key={m.metodo_pago}>
                      <td>{m.metodo_pago}</td>
                      <td>{m.pedidos}</td>
                      <td>{cf.format(m.monto)}</td>
                    </tr>
                  ))}
                  {data.por_metodo.length === 0 && (
                    <tr><td colSpan={3} className="receta-vacia">Sin datos.</td></tr>
                  )}
                </tbody>
              </table>

              <h3 className="dash-subtitulo">Por tipo de pedido</h3>
              <table className="admin-tabla dash-tabla">
                <thead>
                  <tr><th>Tipo</th><th>Pedidos</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {data.por_tipo.map((t) => (
                    <tr key={t.tipo_pedido}>
                      <td>{t.tipo_pedido}</td>
                      <td>{t.pedidos}</td>
                      <td>{cf.format(t.monto)}</td>
                    </tr>
                  ))}
                  {data.por_tipo.length === 0 && (
                    <tr><td colSpan={3} className="receta-vacia">Sin datos.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="dash-seccion">
              <h3>Top productos</h3>
              <table className="admin-tabla dash-tabla">
                <thead>
                  <tr><th>Producto</th><th>Cantidad</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {data.top_productos.map((t, i) => (
                    <tr key={i}>
                      <td>
                        <span className="dash-rank">{i + 1}</span>
                        {t.nombre}
                      </td>
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
        </>
      ) : null}
    </div>
  );
}
