import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DatosEmisor } from "../../api/empresa";
import type { ResumenTurno } from "../../api/caja";
import { Cabecera } from "./ImpresionPedido";

/** Datos del turno que no vienen en el resumen (nombre de caja, cajero). */
export type CorteMeta = {
  caja?: string | null;
  cajero?: string | null;
};

const m = (n: number) => "$ " + Math.round(n).toLocaleString("es-CL");

function fechaLegible(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

const METODO_LEGIBLE: Record<string, string> = {
  EFECTIVO: "Efectivo",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
};

function Fila({ etiqueta, valor, fuerte, signo }: {
  etiqueta: string;
  valor: number;
  fuerte?: boolean;
  signo?: "+" | "-";
}) {
  return (
    <div className={"tk-row" + (fuerte ? " tk-strong" : "")}>
      <span>{etiqueta}</span>
      <span>{signo ?? ""}{m(valor)}</span>
    </div>
  );
}

export function CorteZ({
  resumen,
  emisor,
  meta,
}: {
  resumen: ResumenTurno;
  emisor: DatosEmisor | null;
  meta?: CorteMeta;
}) {
  const t = resumen.turno;
  const contado = t.efectivo_contado;
  const diferencia = t.diferencia;
  const cerrado = t.estado === "CERRADO";

  return (
    <div className="tk tkz">
      <Cabecera emisor={emisor} />

      <div className="tk-sep" />
      <div className="tkz-titulo">{cerrado ? "CORTE Z" : "CORTE X (turno abierto)"}</div>
      <div className="tk-center">Turno #{t.id_turno}</div>

      <div className="tk-sep" />
      <div className="tk-row tk-suave"><span>Caja</span><span>{meta?.caja ?? "—"}</span></div>
      <div className="tk-row tk-suave"><span>Cajero</span><span>{meta?.cajero ?? "—"}</span></div>
      <div className="tk-row tk-suave"><span>Apertura</span><span>{fechaLegible(t.fecha_apertura)}</span></div>
      <div className="tk-row tk-suave"><span>Cierre</span><span>{fechaLegible(t.fecha_cierre)}</span></div>

      <div className="tk-sep" />
      <div className="tkz-sub">Ventas por medio de pago</div>
      {resumen.pagos.length === 0 ? (
        <div className="tk-center tk-suave">Sin ventas.</div>
      ) : (
        resumen.pagos.map((p) => (
          <Fila key={p.metodo_pago} etiqueta={METODO_LEGIBLE[p.metodo_pago] ?? p.metodo_pago} valor={p.total} />
        ))
      )}
      <Fila etiqueta={`${resumen.pedidos_cantidad} pedidos`} valor={resumen.pedidos_monto} fuerte />

      <div className="tk-sep" />
      <div className="tkz-sub">Efectivo</div>
      <Fila etiqueta="Monto inicial" valor={resumen.monto_inicial} />
      <Fila etiqueta="Ventas en efectivo" valor={resumen.efectivo_ventas} signo="+" />
      {resumen.movimientos_ingresos > 0 && <Fila etiqueta="Ingresos" valor={resumen.movimientos_ingresos} signo="+" />}
      {resumen.movimientos_retiros > 0 && <Fila etiqueta="Retiros" valor={resumen.movimientos_retiros} signo="-" />}
      {resumen.movimientos_gastos > 0 && <Fila etiqueta="Gastos" valor={resumen.movimientos_gastos} signo="-" />}
      {resumen.devoluciones > 0 && <Fila etiqueta="Devoluciones" valor={resumen.devoluciones} signo="-" />}
      <Fila etiqueta="Efectivo esperado" valor={resumen.efectivo_esperado} fuerte />
      {contado != null && (
        <>
          <Fila etiqueta="Efectivo contado" valor={Number(contado)} />
          <div className="tk-row tk-strong tkz-dif">
            <span>Diferencia</span>
            <span>{Number(diferencia) > 0 ? "+" : ""}{m(Number(diferencia))}</span>
          </div>
        </>
      )}

      {resumen.movimientos.length > 0 && (
        <>
          <div className="tk-sep" />
          <div className="tkz-sub">Movimientos</div>
          {resumen.movimientos.map((mv) => (
            <div key={mv.id_movimiento} className="tkz-mov">
              <div className="tk-row">
                <span>{mv.tipo_movimiento}</span>
                <span>{m(Number(mv.monto))}</span>
              </div>
              <div className="tk-suave">{mv.motivo}</div>
            </div>
          ))}
        </>
      )}

      {resumen.anulaciones.length > 0 && (
        <>
          <div className="tk-sep" />
          <div className="tkz-sub">Anuladas ({resumen.anulaciones.length})</div>
          {resumen.anulaciones.map((a) => (
            <div key={a.id_pedido} className="tkz-mov">
              <div className="tk-row">
                <span>
                  {a.numero != null ? `Venta ${a.numero}` : `#${a.id_pedido}`}
                  {a.con_devolucion ? "" : " · sin devol."}
                </span>
                <span>-{m(Number(a.total))}</span>
              </div>
              {a.motivo && <div className="tk-suave">{a.motivo}</div>}
            </div>
          ))}
        </>
      )}

      <div className="tk-sep" />
      <div className="tk-center tk-suave">Impreso {fechaLegible(new Date().toISOString())}</div>
    </div>
  );
}

export function ImpresionCorteZ({
  resumen,
  emisor = null,
  meta,
  onDone,
}: {
  resumen: ResumenTurno | null;
  emisor?: DatosEmisor | null;
  meta?: CorteMeta;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!resumen) return;
    const id = window.setTimeout(() => {
      window.print();
      window.setTimeout(onDone, 400);
    }, 60);
    return () => window.clearTimeout(id);
  }, [resumen, onDone]);

  if (!resumen) return null;

  return createPortal(
    <div className="impresion-portal">
      <CorteZ resumen={resumen} emisor={emisor} meta={meta} />
    </div>,
    document.body
  );
}
