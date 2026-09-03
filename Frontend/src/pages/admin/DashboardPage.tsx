import { useCallback, useEffect, useState } from "react";
import { getDashboard, type DashboardData } from "../../api/estadisticas";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const pf = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 });

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Preset = "hoy" | "7d" | "mes" | "custom";

function rangoDePreset(p: Preset): { desde: string; hasta: string } {
  const hoy = new Date();
  if (p === "hoy") return { desde: iso(hoy), hasta: iso(hoy) };
  if (p === "7d") {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 6);
    return { desde: iso(d), hasta: iso(hoy) };
  }
  // mes
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { desde: iso(primero), hasta: iso(hoy) };
}

export function DashboardPage() {
  const { accessToken } = useAuth();

  const [preset, setPreset] = useState<Preset>("hoy");
  const [desde, setDesde] = useState(() => rangoDePreset("hoy").desde);
  const [hasta, setHasta] = useState(() => rangoDePreset("hoy").hasta);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = rangoDePreset(p);
      setDesde(r.desde);
      setHasta(r.hasta);
    }
  };

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    getDashboard(accessToken, desde, hasta)
      .then(setData)
      .catch((err) => setError(mensajeError(err, "Error cargando el dashboard")))
      .finally(() => setLoading(false));
  }, [accessToken, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const maxVenta = data ? Math.max(1, ...data.por_dia.map((d) => d.ventas)) : 1;

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
      </div>

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : data ? (
        <>
          <div className="dash-tiles">
            <div className="dash-tile">
              <span>Ventas</span>
              <strong>{cf.format(data.resumen.ventas)}</strong>
            </div>
            <div className="dash-tile">
              <span>Pedidos</span>
              <strong>{data.resumen.pedidos}</strong>
            </div>
            <div className="dash-tile">
              <span>Ticket promedio</span>
              <strong>{cf.format(data.resumen.ticket_promedio)}</strong>
            </div>
            <div className="dash-tile dash-tile--ganancia">
              <span>Ganancia bruta</span>
              <strong>{cf.format(data.resumen.ganancia_bruta)}</strong>
              <small>margen {pf.format(data.resumen.margen)} · costo {cf.format(data.resumen.costo)}</small>
            </div>
          </div>

          <section className="dash-seccion">
            <h3>Ventas por día</h3>
            {data.por_dia.length === 0 ? (
              <p className="admin-stub">Sin ventas en el rango.</p>
            ) : (
              <div className="dash-barras">
                {data.por_dia.map((d) => (
                  <div key={d.dia} className="dash-barra">
                    <div className="dash-barra-col">
                      <div
                        className="dash-barra-fill"
                        style={{ height: `${Math.max(4, (d.ventas / maxVenta) * 100)}%` }}
                        title={`${cf.format(d.ventas)} · ${d.pedidos} pedidos`}
                      />
                    </div>
                    <span className="dash-barra-label">
                      {new Date(d.dia + "T12:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="dash-barra-valor">{cf.format(d.ventas)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="dash-cols">
            <section className="dash-seccion">
              <h3>Por medio de pago</h3>
              <table className="admin-tabla">
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
              <h3 style={{ marginTop: 18 }}>Por tipo de pedido</h3>
              <table className="admin-tabla">
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
                </tbody>
              </table>
            </section>

            <section className="dash-seccion">
              <h3>Top productos</h3>
              <table className="admin-tabla">
                <thead>
                  <tr><th>Producto</th><th>Cantidad</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {data.top_productos.map((t, i) => (
                    <tr key={i}>
                      <td>{t.nombre}</td>
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
