import { useCallback, useState } from "react";
import { getDashboard, type DashboardData } from "../../api/estadisticas";
import { obtenerEmisor, type DatosEmisor } from "../../api/empresa";
import { InformeImpresion, type InformeMeta } from "../../components/print/InformeImpresion";
import { useAuth } from "../../context/useAuth";
import { useRecurso } from "../../hooks/useRecurso";
import { mensajeError } from "../../lib/errores";
import { fechaNegocioISO, haceDiasISO, primerDiaDelMesISO } from "../../lib/fecha";

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type Preset = "hoy" | "7d" | "mes" | "custom";

function rangoDePreset(p: Preset): { desde: string; hasta: string } {
  const hoy = fechaNegocioISO();
  if (p === "hoy") return { desde: hoy, hasta: hoy };
  if (p === "7d") return { desde: haceDiasISO(6), hasta: hoy };
  return { desde: primerDiaDelMesISO(), hasta: hoy };
}

export function InformesPage() {
  const { accessToken, currentUser } = useAuth();

  const [preset, setPreset] = useState<Preset>("mes");
  const [desde, setDesde] = useState(() => rangoDePreset("mes").desde);
  const [hasta, setHasta] = useState(() => rangoDePreset("mes").hasta);

  const [generando, setGenerando] = useState(false);
  const [errorGenerar, setErrorGenerar] = useState<string | null>(null);
  const [impresion, setImpresion] = useState<{ data: DashboardData; emisor: DatosEmisor | null; meta: InformeMeta } | null>(
    null
  );

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = rangoDePreset(p);
      setDesde(r.desde);
      setHasta(r.hasta);
    }
  };

  const cargador = useCallback(() => getDashboard(accessToken, desde, hasta), [accessToken, desde, hasta]);
  const {
    datos: data,
    loading,
    error,
  } = useRecurso<DashboardData | null>(cargador, "Error cargando el informe", null);

  const generar = async () => {
    setErrorGenerar(null);
    setGenerando(true);
    try {
      const [datosFrescos, emisor] = await Promise.all([
        getDashboard(accessToken, desde, hasta),
        obtenerEmisor(accessToken),
      ]);
      const nombre = [currentUser?.nombre, currentUser?.apellido].filter(Boolean).join(" ") || currentUser?.username || "—";
      setImpresion({ data: datosFrescos, emisor, meta: { desde, hasta, generadoPor: nombre } });
    } catch (err) {
      setErrorGenerar(mensajeError(err, "No se pudo generar el informe"));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="admin-modulo">
      <h2>Informes</h2>
      <p className="admin-ayuda">
        Un resumen del período elegido, listo para imprimir o guardar como PDF (desde el diálogo de
        impresión).
      </p>

      <div className="dash-encabezado">
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
        </div>
      </div>

      {preset === "custom" && (
        <div className="dash-fechas">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <span>—</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      )}

      {errorGenerar && (
        <div className="dash-aviso dash-aviso--error" role="alert">
          {errorGenerar}
        </div>
      )}

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : data ? (
        <>
          <div className="inf-preview">
            <div>
              <span>Ventas</span>
              <strong>{cf.format(data.resumen.ventas)}</strong>
            </div>
            <div>
              <span>Pedidos</span>
              <strong>{data.resumen.pedidos}</strong>
            </div>
            <div>
              <span>Ticket promedio</span>
              <strong>{cf.format(data.resumen.ticket_promedio)}</strong>
            </div>
            <div>
              <span>Ganancia bruta</span>
              <strong>{cf.format(data.resumen.ganancia_bruta)}</strong>
            </div>
          </div>

          <p className="admin-ayuda">
            El informe completo también trae ventas por día, medios de pago, tipos de pedido y los
            productos más vendidos.
          </p>

          <button type="button" className="receta-guardar" disabled={generando} onClick={generar}>
            {generando ? "Generando…" : "Generar informe (imprimir / PDF)"}
          </button>
        </>
      ) : null}

      <InformeImpresion
        data={impresion?.data ?? null}
        emisor={impresion?.emisor ?? null}
        meta={impresion?.meta ?? null}
        onDone={() => setImpresion(null)}
      />
    </div>
  );
}
