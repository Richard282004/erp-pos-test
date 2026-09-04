import { useCallback, useEffect, useState } from "react";
import {
  listarPedidos,
  obtenerPedido,
  anularPedido,
  type PedidoResumen,
  type PedidoDetalle,
} from "../../api/pedidos";
import { ImpresionPedido, type PedidoImpr } from "../../components/print/ImpresionPedido";
import { obtenerEmisor, type DatosEmisor } from "../../api/empresa";
import { useAuth } from "../../context/useAuth";

function detalleAImpr(d: PedidoDetalle): PedidoImpr {
  return {
    id_pedido: d.id_pedido,
    fecha: d.fecha_creacion,
    tipo_pedido: d.tipo_pedido,
    sucursal: d.sucursal,
    cajero: d.username,
    items: d.items.map((it) => ({
      nombre: it.nombre_producto ?? `#${it.id_producto}`,
      cantidad: it.cantidad,
      precio_unitario:
        Number(it.precio) +
        (it.modificadores ?? []).reduce((s, mm) => s + Number(mm.precio_adicional), 0),
      descuento_pct: Number(it.descuento),
      modificadores: (it.modificadores ?? []).map((mm) => ({
        nombre: mm.nombre,
        precio_adicional: Number(mm.precio_adicional),
      })),
    })),
    subtotal: Number(d.subtotal),
    descuento_monto: Number(d.descuento),
    total: Number(d.total),
    pago: d.pagos[0]
      ? {
          metodo: d.pagos[0].metodo_pago,
          monto: Number(d.pagos[0].monto),
          recibido: d.pagos[0].monto_recibido != null ? Number(d.pagos[0].monto_recibido) : null,
          vuelto: d.pagos[0].vuelto != null ? Number(d.pagos[0].vuelto) : null,
        }
      : null,
    observacion: d.observacion,
  };
}

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fechaHora(s: string) {
  return new Date(s).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const ESTADOS = ["", "ENTREGADO", "PENDIENTE", "PREPARANDO", "LISTO", "EN_REPARTO", "CANCELADO"];

export function PedidosPage() {
  const { accessToken } = useAuth();

  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [soloHoy, setSoloHoy] = useState(true);
  const [estado, setEstado] = useState("");

  const [detalle, setDetalle] = useState<PedidoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [modoImpr, setModoImpr] = useState<"ticket" | "comanda" | null>(null);
  const [emisor, setEmisor] = useState<DatosEmisor | null>(null);

  useEffect(() => {
    obtenerEmisor(accessToken).then(setEmisor).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    listarPedidos(accessToken, {
      estado: estado || undefined,
      desde: soloHoy ? hoyISO() : undefined,
      limite: 300,
    })
      .then(setPedidos)
      .catch((err) => setError(mensajeError(err, "Error cargando pedidos")))
      .finally(() => setLoading(false));
  }, [accessToken, estado, soloHoy]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirDetalle = (id: number) => {
    setDetalleLoading(true);
    setDetalle(null);
    obtenerPedido(id, accessToken)
      .then(setDetalle)
      .catch((err) => setError(mensajeError(err, "Error cargando el pedido")))
      .finally(() => setDetalleLoading(false));
  };

  const totalDia = pedidos
    .filter((p) => p.estado !== "CANCELADO")
    .reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="admin-modulo">
      <h2>Pedidos</h2>

      <div className="admin-toolbar">
        <div className="pedidos-filtros">
          <label className="admin-toggle-inactivos">
            <input type="checkbox" checked={soloHoy} onChange={(e) => setSoloHoy(e.target.checked)} />
            Solo hoy
          </label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e || "Todos los estados"}</option>
            ))}
          </select>
          <button onClick={cargar}>Actualizar</button>
        </div>
        <span className="pedidos-total">
          {pedidos.filter((p) => p.estado !== "CANCELADO").length} pedidos · {cf.format(totalDia)}
        </span>
      </div>

      {loading ? (
        <div className="cargando">Cargando pedidos…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : pedidos.length === 0 ? (
        <p className="admin-stub">No hay pedidos con ese filtro.</p>
      ) : (
        <table className="admin-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Cajero</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id_pedido} className={p.estado === "CANCELADO" ? "admin-fila-inactiva" : undefined}>
                <td>{p.id_pedido}</td>
                <td>{fechaHora(p.fecha_creacion)}</td>
                <td>{p.tipo_pedido}</td>
                <td>{p.username ?? "—"}</td>
                <td>{cf.format(Number(p.total))}</td>
                <td className={p.estado === "CANCELADO" ? "admin-estado-inactivo" : "admin-estado-activo"}>
                  {p.estado}
                </td>
                <td className="admin-acciones">
                  <button onClick={() => abrirDetalle(p.id_pedido)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(detalleLoading || detalle) && (
        <div className="admin-modal" onClick={() => setDetalle(null)}>
          <div className="admin-modal-form corte-modal" onClick={(e) => e.stopPropagation()}>
            {detalleLoading || !detalle ? (
              <div className="cargando">Cargando…</div>
            ) : (
              <>
                <h3>Pedido #{detalle.id_pedido}</h3>
                <div className="admin-nota-modal">
                  {fechaHora(detalle.fecha_creacion)} · {detalle.tipo_pedido} · {detalle.sucursal ?? ""} · {detalle.username ?? ""}
                  {detalle.estado === "CANCELADO" && " · ANULADO"}
                </div>

                <div className="corte-seccion">
                  <h4>Ítems</h4>
                  {detalle.items.map((it) => (
                    <div key={it.id_item} className="corte-linea">
                      <span>{it.cantidad}× {it.nombre_producto ?? `#${it.id_producto}`}{Number(it.descuento) > 0 ? ` (−${it.descuento}%)` : ""}</span>
                      <strong>{cf.format(Number(it.precio) * it.cantidad)}</strong>
                    </div>
                  ))}
                  <div className="corte-linea"><span>Subtotal</span><strong>{cf.format(Number(detalle.subtotal))}</strong></div>
                  <div className="corte-linea"><span>Descuento</span><strong>−{cf.format(Number(detalle.descuento))}</strong></div>
                  <div className="corte-linea corte-total"><span>Total</span><strong>{cf.format(Number(detalle.total))}</strong></div>
                </div>

                <div className="corte-seccion">
                  <h4>Pago</h4>
                  {detalle.pagos.map((pg) => (
                    <div key={pg.id_pago} className="corte-linea">
                      <span>{pg.metodo_pago}{pg.vuelto ? ` · vuelto ${cf.format(Number(pg.vuelto))}` : ""}</span>
                      <strong>{cf.format(Number(pg.monto))}</strong>
                    </div>
                  ))}
                </div>

                {detalle.observacion && <p className="admin-nota-modal">Obs: {detalle.observacion}</p>}

                <div className="pedido-detalle-btns">
                  <button onClick={() => setModoImpr("comanda")}>🧑‍🍳 Comanda</button>
                  <button onClick={() => setModoImpr("ticket")}>🧾 Ticket</button>
                  {detalle.estado !== "CANCELADO" && (
                    <button
                      className="pedido-anular"
                      disabled={anulando}
                      onClick={async () => {
                        if (!confirm(`¿Anular el pedido #${detalle.id_pedido}? Sale del total del turno.`)) return;
                        setAnulando(true);
                        try {
                          await anularPedido(detalle.id_pedido, accessToken);
                          setDetalle(null);
                          cargar();
                        } catch (err) {
                          alert(mensajeError(err, "Error al anular"));
                        } finally {
                          setAnulando(false);
                        }
                      }}
                    >
                      {anulando ? "Anulando…" : "Anular pedido"}
                    </button>
                  )}
                  <button onClick={() => setDetalle(null)} style={{ marginLeft: 8 }}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ImpresionPedido
        pedido={detalle ? detalleAImpr(detalle) : null}
        modo={modoImpr}
        emisor={emisor}
        onDone={() => setModoImpr(null)}
      />
    </div>
  );
}
