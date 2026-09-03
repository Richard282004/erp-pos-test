import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DatosEmisor } from "../../api/empresa";

export type ItemImpr = {
  nombre: string;
  cantidad: number;
  precio_unitario: number; // producto base + modificadores
  descuento_pct: number;
  modificadores: { nombre: string; precio_adicional: number }[];
};

export type PedidoImpr = {
  id_pedido: number | null;
  fecha: string;
  tipo_pedido: string;
  sucursal?: string | null;
  cajero?: string | null;
  items: ItemImpr[];
  subtotal: number;
  descuento_monto: number;
  total: number;
  pago?: {
    metodo: string;
    monto: number;
    recibido?: number | null;
    vuelto?: number | null;
  } | null;
  observacion?: string | null;
};

const IVA_PCT = 19;

const m = (n: number) => "$ " + Math.round(n).toLocaleString("es-CL");

function fechaLegible(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

const TIPO_LEGIBLE: Record<string, string> = {
  LOCAL: "Para servir aquí",
  RETIRO: "Para llevar",
  DELIVERY: "Delivery",
};

const METODO_LEGIBLE: Record<string, string> = {
  EFECTIVO: "Efectivo",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
};

/** Los precios que se cobran ya incluyen IVA: se desglosa hacia atrás. */
function desglosarIva(total: number) {
  const neto = Math.round(total / (1 + IVA_PCT / 100));
  return { neto, iva: Math.round(total) - neto };
}

function Cabecera({ emisor, sucursalPedido }: { emisor: DatosEmisor | null; sucursalPedido?: string | null }) {
  const e = emisor?.empresa ?? null;
  const s = emisor?.sucursal ?? null;
  const nombre = e?.nombre ?? "BYEBURGER";
  const direccion = [s?.direccion, s?.comuna].filter(Boolean).join(", ");

  return (
    <div className="tk-cab">
      <div className="tk-logo">{nombre}</div>
      {s?.nombre && <div className="tk-cab-linea">{s.nombre}</div>}
      {!s?.nombre && sucursalPedido && <div className="tk-cab-linea">{sucursalPedido}</div>}
      {e?.razon_social && <div className="tk-cab-linea">{e.razon_social}</div>}
      {direccion && <div className="tk-cab-linea">{direccion}</div>}
      {(s?.telefono || e?.telefono) && (
        <div className="tk-cab-linea">Tel.: {s?.telefono || e?.telefono}</div>
      )}
      {e?.rut && <div className="tk-cab-linea">RUT: {e.rut}</div>}
      {e?.email && <div className="tk-cab-linea">{e.email}</div>}
      {e?.sitio_web && <div className="tk-cab-linea">{e.sitio_web}</div>}
    </div>
  );
}

export function Ticket({ p, emisor }: { p: PedidoImpr; emisor: DatosEmisor | null }) {
  const { neto, iva } = desglosarIva(p.total);
  const tipo = TIPO_LEGIBLE[p.tipo_pedido] ?? p.tipo_pedido;

  return (
    <div className="tk">
      <Cabecera emisor={emisor} sucursalPedido={p.sucursal} />

      <div className="tk-sep" />
      {p.cajero && <div className="tk-center">Atendido por {p.cajero}</div>}
      <div className="tk-numero">{p.id_pedido ?? "—"}</div>
      <div className="tk-center tk-tipo">{tipo}</div>

      <div className="tk-items">
        {p.items.map((it, i) => {
          const bruto = it.precio_unitario * it.cantidad;
          const totalLinea = bruto * (1 - it.descuento_pct / 100);
          return (
            <div key={i} className="tk-item">
              <div className="tk-row tk-item-top">
                <span className="tk-item-nombre">{it.nombre}</span>
                <span className="tk-item-total">{m(totalLinea)}</span>
              </div>
              <div className="tk-item-detalle">
                {it.cantidad} &nbsp;x {m(it.precio_unitario)} / Unidades
                {it.descuento_pct > 0 ? `  (-${it.descuento_pct}%)` : ""}
              </div>
              {it.modificadores.map((md, j) => (
                <div key={j} className="tk-item-mod">
                  + {md.nombre}
                  {md.precio_adicional > 0 ? ` ${m(md.precio_adicional)}` : ""}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="tk-sep" />
      {p.descuento_monto > 0 && (
        <div className="tk-row">
          <span>Descuento</span>
          <span>-{m(p.descuento_monto)}</span>
        </div>
      )}
      <div className="tk-row">
        <span>Monto neto</span>
        <span>{m(neto)}</span>
      </div>
      <div className="tk-row tk-suave">
        <span>IVA {IVA_PCT}%</span>
        <span>{m(iva)}</span>
      </div>
      <div className="tk-sep" />
      <div className="tk-row tk-total">
        <span>Total</span>
        <span>{m(p.total)}</span>
      </div>

      {p.pago && (
        <>
          <div className="tk-row">
            <span>{METODO_LEGIBLE[p.pago.metodo] ?? p.pago.metodo}</span>
            <span>{m(p.pago.monto)}</span>
          </div>
          {p.pago.recibido != null && (
            <div className="tk-row tk-suave">
              <span>Recibido</span>
              <span>{m(p.pago.recibido)}</span>
            </div>
          )}
          {p.pago.vuelto != null && p.pago.vuelto > 0 && (
            <div className="tk-row tk-suave">
              <span>Vuelto</span>
              <span>{m(p.pago.vuelto)}</span>
            </div>
          )}
        </>
      )}

      {p.observacion && (
        <>
          <div className="tk-sep" />
          <div className="tk-item-detalle">Obs: {p.observacion}</div>
        </>
      )}

      <div className="tk-sep" />
      <div className="tk-center tk-gracias">
        {emisor?.empresa?.mensaje_ticket || "¡GRACIAS POR TU COMPRA!"}
      </div>
      <div className="tk-center tk-suave">{fechaLegible(p.fecha)}</div>
    </div>
  );
}

export function Comanda({ p }: { p: PedidoImpr }) {
  return (
    <div className="tk cmd">
      <div className="tk-row tk-strong tk-lg">
        <span>COMANDA #{p.id_pedido ?? "—"}</span>
        <span>{TIPO_LEGIBLE[p.tipo_pedido] ?? p.tipo_pedido}</span>
      </div>
      <div className="tk-center">{fechaLegible(p.fecha)}</div>
      <div className="tk-sep" />

      {p.items.map((it, i) => (
        <div key={i} className="cmd-item">
          <div className="cmd-nombre">{it.cantidad}× {it.nombre}</div>
          {it.modificadores.map((md, j) => (
            <div key={j} className="cmd-mod">→ {md.nombre}</div>
          ))}
        </div>
      ))}

      {p.observacion && (
        <>
          <div className="tk-sep" />
          <div className="cmd-obs">OBS: {p.observacion}</div>
        </>
      )}
    </div>
  );
}

export function ImpresionPedido({
  pedido,
  modo,
  emisor = null,
  onDone,
}: {
  pedido: PedidoImpr | null;
  modo: "ticket" | "comanda" | null;
  emisor?: DatosEmisor | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!pedido || !modo) return;
    const id = window.setTimeout(() => {
      window.print();
      window.setTimeout(onDone, 400);
    }, 60);
    return () => window.clearTimeout(id);
  }, [pedido, modo, onDone]);

  if (!pedido || !modo) return null;

  return createPortal(
    <div className="impresion-portal">
      {modo === "ticket" ? <Ticket p={pedido} emisor={emisor} /> : <Comanda p={pedido} />}
    </div>,
    document.body
  );
}
