import { useEffect, useMemo, useState } from "react";
import { listarInsumos, unidadesCompra, type Insumo } from "../../api/insumos";
import {
  registrarCompra,
  listarCompras,
  type Compra,
  type CompraItemInput,
} from "../../api/inventario";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });

type Linea = { id_insumo: number | null; cantidad_compra: number; unidad_compra: string; costo_total: number };

const LINEA_VACIA: Linea = { id_insumo: null, cantidad_compra: 0, unidad_compra: "", costo_total: 0 };

export function ComprasPage() {
  const { accessToken } = useAuth();

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proveedor, setProveedor] = useState("");
  const [nota, setNota] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const insumoPorId = useMemo(
    () => new Map(insumos.map((i) => [i.id_insumo, i])),
    [insumos]
  );

  const cargarCompras = () => {
    listarCompras(accessToken)
      .then(setCompras)
      .catch((err) => setError(mensajeError(err, "Error cargando compras")));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([listarInsumos(accessToken), listarCompras(accessToken)])
      .then(([ins, com]) => {
        setInsumos(ins);
        setCompras(com);
      })
      .catch((err) => setError(mensajeError(err, "Error cargando datos")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLinea = (idx: number, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, i) => (i === idx ? { ...l, ...cambio } : l)));

  const totalCompra = lineas.reduce((s, l) => s + (l.costo_total || 0), 0);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const items: CompraItemInput[] = [];
    for (const l of lineas) {
      if (l.id_insumo === null) {
        setFormError("Elegí un insumo en cada línea (o borrá la línea vacía).");
        return;
      }
      if (l.cantidad_compra <= 0 || l.costo_total < 0 || !l.unidad_compra) {
        setFormError("Revisá cantidad, unidad y costo de cada línea.");
        return;
      }
      items.push({
        id_insumo: l.id_insumo,
        cantidad_compra: l.cantidad_compra,
        unidad_compra: l.unidad_compra,
        costo_total: l.costo_total,
      });
    }

    setGuardando(true);
    try {
      await registrarCompra(
        { proveedor: proveedor || null, nota: nota || null, items },
        accessToken
      );
      setProveedor("");
      setNota("");
      setLineas([{ ...LINEA_VACIA }]);
      cargarCompras();
      // refrescar costos/stock de insumos para las próximas líneas
      listarInsumos(accessToken).then(setInsumos).catch(() => {});
    } catch (err) {
      setFormError(mensajeError(err, "Error registrando la compra"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-modulo">
      <h2>Compras</h2>

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : insumos.length === 0 ? (
        <p className="admin-stub">
          Primero creá insumos en la sección <strong>Insumos</strong>, después registrás sus compras acá.
        </p>
      ) : (
        <>
          <section className="admin-form-section">
            <h3>Registrar compra</h3>
            <form className="compra-form" onSubmit={enviar}>
              <div className="compra-cabecera">
                <label>
                  Proveedor
                  <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Opcional" />
                </label>
                <label>
                  Nota
                  <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
                </label>
              </div>

              <div className="compra-lineas">
                {lineas.map((l, idx) => {
                  const ins = l.id_insumo !== null ? insumoPorId.get(l.id_insumo) : undefined;
                  const unidades = ins ? unidadesCompra(ins.unidad) : [];
                  return (
                    <div className="compra-linea" key={idx}>
                      <select
                        value={l.id_insumo ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          const nuevo = id !== null ? insumoPorId.get(id) : undefined;
                          setLinea(idx, {
                            id_insumo: id,
                            unidad_compra: nuevo ? unidadesCompra(nuevo.unidad)[0] : "",
                          });
                        }}
                      >
                        <option value="">— insumo —</option>
                        {insumos.map((i) => (
                          <option key={i.id_insumo} value={i.id_insumo}>
                            {i.nombre}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        min={0}
                        placeholder="Cantidad"
                        value={l.cantidad_compra || ""}
                        onChange={(e) => setLinea(idx, { cantidad_compra: Number(e.target.value) })}
                      />

                      <select
                        value={l.unidad_compra}
                        onChange={(e) => setLinea(idx, { unidad_compra: e.target.value })}
                        disabled={!ins}
                      >
                        {unidades.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        min={0}
                        placeholder="Costo total $"
                        value={l.costo_total || ""}
                        onChange={(e) => setLinea(idx, { costo_total: Number(e.target.value) })}
                      />

                      <button
                        type="button"
                        className="compra-quitar"
                        onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls))}
                        disabled={lineas.length === 1}
                        aria-label="Quitar línea"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="compra-pie">
                <button type="button" onClick={() => setLineas((ls) => [...ls, { ...LINEA_VACIA }])}>
                  + Agregar línea
                </button>
                <span className="compra-total">Total: {cf.format(totalCompra)}</span>
                <button type="submit" className="compra-guardar" disabled={guardando}>
                  {guardando ? "Registrando…" : "Registrar compra"}
                </button>
              </div>

              {formError && <div className="error-productos">{formError}</div>}
            </form>
          </section>

          <section>
            <h3>Historial</h3>
            {compras.length === 0 ? (
              <p className="admin-stub">Todavía no se registraron compras.</p>
            ) : (
              <div className="compra-historial">
                {compras.map((c) => (
                  <article className="compra-card" key={c.id_compra}>
                    <header>
                      <strong>{cf.format(c.total)}</strong>
                      <span>
                        {new Date(c.fecha).toLocaleDateString("es-CL")}
                        {c.proveedor ? ` · ${c.proveedor}` : ""}
                        {c.username ? ` · ${c.username}` : ""}
                      </span>
                    </header>
                    <ul>
                      {c.items.map((it, i) => (
                        <li key={i}>
                          {it.insumo} — {nf.format(it.cantidad_compra)} {it.unidad_compra}
                          {" "}({nf.format(it.cantidad_base)} base) · {cf.format(it.costo_total)}
                        </li>
                      ))}
                    </ul>
                    {c.nota && <p className="compra-nota">{c.nota}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
