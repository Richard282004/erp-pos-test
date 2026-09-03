import { useEffect } from "react";
import { createPortal } from "react-dom";

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

const m = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

function fechaLegible(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function Ticket({ p }: { p: PedidoImpr }) {
  return (
    <div className="tk">
      <div className="tk-center tk-strong tk-lg">BYEBURGER</div>
      {p.sucursal && <div className="tk-center">{p.sucursal}</div>}
      <div className="tk-sep" />
      <div className="tk-row"><span>Pedido</span><span>#{p.id_pedido ?? "—"}</span></div>
      <div className="tk-row"><span>Fecha</span><span>{fechaLegible(p.fecha)}</span></div>
      <div className="tk-row"><span>Tipo</span><span>{p.tipo_pedido}</span></div>
      {p.cajero && <div className="tk-row"><span>Cajero</span><span>{p.cajero}</span></div>}
      <div className="tk-sep" />

      {p.items.map((it, i) => {
        const bruto = it.precio_unitario * it.cantidad;
        const neto = bruto * (1 - it.descuento_pct / 100);
        return (
          <div key={i} className="tk-item">
            <div className="tk-row">
              <span>{it.cantidad}× {it.nombre}</span>
              <span>{m(neto)}</span>
            </div>
            {it.modificadores.map((md, j) => (
              <div key={j} className="tk-sub">
                + {md.nombre}
                {md.precio_adicional > 0 ? ` (${m(md.precio_adicional)})` : ""}
              </div>
            ))}
            {it.descuento_pct > 0 && <div className="tk-sub">dcto {it.descuento_pct}%</div>}
          </div>
        );
      })}

      <div className="tk-sep" />
      <div className="tk-row"><span>Subtotal</span><span>{m(p.subtotal)}</span></div>
      {p.descuento_monto > 0 && (
        <div className="tk-row"><span>Descuento</span><span>-{m(p.descuento_monto)}</span></div>
      )}
      <div className="tk-row tk-strong tk-lg"><span>TOTAL</span><span>{m(p.total)}</span></div>

      {p.pago && (
        <>
          <div className="tk-sep" />
          <div className="tk-row"><span>{p.pago.metodo}</span><span>{m(p.pago.monto)}</span></div>
          {p.pago.recibido != null && (
            <div className="tk-row"><span>Recibido</span><span>{m(p.pago.recibido)}</span></div>
          )}
          {p.pago.vuelto != null && p.pago.vuelto > 0 && (
            <div className="tk-row"><span>Vuelto</span><span>{m(p.pago.vuelto)}</span></div>
          )}
        </>
      )}

      {p.observacion && (
        <>
          <div className="tk-sep" />
          <div className="tk-sub">Obs: {p.observacion}</div>
        </>
      )}

      <div className="tk-sep" />
      <div className="tk-center">¡Gracias por tu compra!</div>
    </div>
  );
}

function Comanda({ p }: { p: PedidoImpr }) {
  return (
    <div className="tk cmd">
      <div className="tk-row tk-strong tk-lg">
        <span>COMANDA #{p.id_pedido ?? "—"}</span>
        <span>{p.tipo_pedido}</span>
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
  onDone,
}: {
  pedido: PedidoImpr | null;
  modo: "ticket" | "comanda" | null;
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
      {modo === "ticket" ? <Ticket p={pedido} /> : <Comanda p={pedido} />}
    </div>,
    document.body
  );
}
