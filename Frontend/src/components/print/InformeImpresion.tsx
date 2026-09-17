import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DatosEmisor } from "../../api/empresa";
import type { DashboardData } from "../../api/estadisticas";

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const pf = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 1 });

function fechaLegible(iso: string) {
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

const TIPO_LEGIBLE: Record<string, string> = {
  LOCAL: "Consumo local",
  RETIRO: "Retiro",
  DELIVERY: "Delivery",
};

export type InformeMeta = {
  desde: string;
  hasta: string;
  generadoPor: string;
};

export function InformeImpresion({
  data,
  emisor,
  meta,
  onDone,
}: {
  data: DashboardData | null;
  emisor: DatosEmisor | null;
  meta: InformeMeta | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!data || !meta) return;
    const id = window.setTimeout(() => {
      window.print();
      window.setTimeout(onDone, 400);
    }, 60);
    return () => window.clearTimeout(id);
  }, [data, meta, onDone]);

  if (!data || !meta) return null;

  const e = emisor?.empresa ?? null;
  const nombreNegocio = e?.nombre ?? "Mi negocio";
  const rango =
    meta.desde === meta.hasta ? fechaLegible(meta.desde) : `${fechaLegible(meta.desde)} — ${fechaLegible(meta.hasta)}`;
  const generado = new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });

  return createPortal(
    <div className="informe-portal">
      <div className="inf">
        <header className="inf-cab">
          <div>
            <h1>{nombreNegocio}</h1>
            {e?.razon_social && <p>{e.razon_social}</p>}
            {e?.rut && <p>RUT: {e.rut}</p>}
          </div>
          <div className="inf-cab-periodo">
            <span>Informe de ventas</span>
            <strong>{rango}</strong>
          </div>
        </header>

        <section className="inf-resumen">
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
            <span>Costo</span>
            <strong>{cf.format(data.resumen.costo)}</strong>
          </div>
          <div>
            <span>Ganancia bruta</span>
            <strong>{cf.format(data.resumen.ganancia_bruta)}</strong>
          </div>
          <div>
            <span>Margen</span>
            <strong>{data.resumen.ventas > 0 ? pf.format(data.resumen.margen) : "—"}</strong>
          </div>
        </section>

        {data.por_dia.length > 1 && (
          <section className="inf-seccion">
            <h2>Ventas por día</h2>
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Pedidos</th>
                  <th>Ventas</th>
                </tr>
              </thead>
              <tbody>
                {data.por_dia.map((d) => (
                  <tr key={d.dia}>
                    <td>{fechaLegible(d.dia)}</td>
                    <td>{d.pedidos}</td>
                    <td>{cf.format(d.ventas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="inf-seccion inf-dos-col">
          <div>
            <h2>Medios de pago</h2>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Ped.</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.por_metodo.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Sin ventas.</td>
                  </tr>
                ) : (
                  data.por_metodo.map((m) => (
                    <tr key={m.metodo_pago}>
                      <td>{m.metodo_pago}</td>
                      <td>{m.pedidos}</td>
                      <td>{cf.format(m.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2>Tipos de pedido</h2>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Ped.</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.por_tipo.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Sin ventas.</td>
                  </tr>
                ) : (
                  data.por_tipo.map((t) => (
                    <tr key={t.tipo_pedido}>
                      <td>{TIPO_LEGIBLE[t.tipo_pedido] ?? t.tipo_pedido}</td>
                      <td>{t.pedidos}</td>
                      <td>{cf.format(t.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="inf-seccion">
          <h2>Productos más vendidos</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.top_productos.length === 0 ? (
                <tr>
                  <td colSpan={4}>Sin ventas.</td>
                </tr>
              ) : (
                data.top_productos.map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.cantidad}</td>
                    <td>{cf.format(p.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <footer className="inf-pie">
          Generado el {generado} por {meta.generadoPor}
        </footer>
      </div>
    </div>,
    document.body
  );
}
