import { useEffect, useMemo, useState } from "react";
import {
  listarProductosConCosto,
  obtenerReceta,
  guardarReceta,
  type ProductoCosto,
} from "../../api/productos";
import { listarInsumos, type Insumo } from "../../api/insumos";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const cf2 = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 2,
});
const pf = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 1,
});

type LineaEdit = {
  id_insumo: number;
  nombre: string;
  unidad: string;
  costo_promedio: number;
  activo: boolean;
  cantidad: number;
};

export function RecetasPage() {
  const { accessToken } = useAuth();

  const [productos, setProductos] = useState<ProductoCosto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selId, setSelId] = useState<number | null>(null);
  const [lineas, setLineas] = useState<LineaEdit[]>([]);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [recetaError, setRecetaError] = useState<string | null>(null);

  const [nuevoInsumoId, setNuevoInsumoId] = useState<string>("");
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(0);
  const [margenObjetivo, setMargenObjetivo] = useState<number>(65);

  const seleccionado = productos.find((p) => p.id_producto === selId) ?? null;

  const cargarProductos = () =>
    listarProductosConCosto(accessToken)
      .then(setProductos)
      .catch((err) => setError(mensajeError(err, "Error cargando productos")));

  useEffect(() => {
    setLoading(true);
    Promise.all([listarProductosConCosto(accessToken), listarInsumos(accessToken)])
      .then(([prods, ins]) => {
        setProductos(prods);
        setInsumos(ins);
      })
      .catch((err) => setError(mensajeError(err, "Error cargando datos")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seleccionar = (id: number) => {
    setSelId(id);
    setRecetaError(null);
    setNuevoInsumoId("");
    setNuevaCantidad(0);
    setCargandoReceta(true);
    obtenerReceta(id, accessToken)
      .then((rows) =>
        setLineas(
          rows.map((r) => ({
            id_insumo: r.id_insumo,
            nombre: r.nombre,
            unidad: r.unidad,
            costo_promedio: r.costo_promedio,
            activo: r.activo,
            cantidad: r.cantidad,
          }))
        )
      )
      .catch((err) => setRecetaError(mensajeError(err, "Error cargando la receta")))
      .finally(() => setCargandoReceta(false));
  };

  const costoTotal = useMemo(
    () => lineas.reduce((s, l) => s + l.cantidad * l.costo_promedio, 0),
    [lineas]
  );

  const precio = seleccionado?.precio ?? 0;
  const ganancia = precio - costoTotal;
  const margen = precio > 0 ? ganancia / precio : 0;
  const precioSugerido =
    margenObjetivo < 100 ? costoTotal / (1 - margenObjetivo / 100) : 0;

  const insumosDisponibles = insumos.filter(
    (i) => !lineas.some((l) => l.id_insumo === i.id_insumo)
  );

  const agregarLinea = () => {
    const id = Number(nuevoInsumoId);
    const ins = insumos.find((i) => i.id_insumo === id);
    if (!ins || nuevaCantidad <= 0) return;
    setLineas((ls) => [
      ...ls,
      {
        id_insumo: ins.id_insumo,
        nombre: ins.nombre,
        unidad: ins.unidad,
        costo_promedio: ins.costo_promedio,
        activo: ins.activo,
        cantidad: nuevaCantidad,
      },
    ]);
    setNuevoInsumoId("");
    setNuevaCantidad(0);
  };

  const guardar = async () => {
    if (selId === null) return;
    setRecetaError(null);
    setGuardando(true);
    try {
      await guardarReceta(
        selId,
        lineas.map((l) => ({ id_insumo: l.id_insumo, cantidad: l.cantidad })),
        accessToken
      );
      await cargarProductos();
    } catch (err) {
      setRecetaError(mensajeError(err, "Error guardando la receta"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="admin-modulo">
      <h2>Recetas</h2>

      {loading ? (
        <div className="cargando">Cargando…</div>
      ) : error ? (
        <div className="error-productos">{error}</div>
      ) : (
        <div className="receta-layout">
          <div className="receta-productos">
            <h3>Productos</h3>
            <ul>
              {productos.map((p) => {
                const m = p.precio > 0 ? (p.precio - p.costo) / p.precio : 0;
                return (
                  <li key={p.id_producto}>
                    <button
                      className={"receta-prod" + (p.id_producto === selId ? " activo" : "")}
                      onClick={() => seleccionar(p.id_producto)}
                    >
                      <span className="receta-prod-nombre">{p.nombre}</span>
                      <span className="receta-prod-meta">
                        {p.lineas_receta === 0 ? (
                          <span className="receta-sin">sin receta</span>
                        ) : (
                          <>
                            {cf.format(p.costo)} · margen {pf.format(m)}
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="receta-editor">
            {!seleccionado ? (
              <p className="admin-stub">Elegí un producto de la lista para ver y editar su receta.</p>
            ) : cargandoReceta ? (
              <div className="cargando">Cargando receta…</div>
            ) : (
              <>
                <div className="receta-editor-head">
                  <h3>{seleccionado.nombre}</h3>
                  <span>Precio de venta: {cf.format(precio)}</span>
                </div>

                <table className="admin-tabla receta-tabla">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Cantidad</th>
                      <th>Costo unit.</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.length === 0 && (
                      <tr>
                        <td colSpan={5} className="receta-vacia">Sin insumos todavía.</td>
                      </tr>
                    )}
                    {lineas.map((l, idx) => (
                      <tr key={l.id_insumo} className={l.activo ? undefined : "admin-fila-inactiva"}>
                        <td>
                          {l.nombre}
                          {!l.activo && <span className="receta-sin"> (insumo inactivo)</span>}
                        </td>
                        <td>
                          <input
                            type="number"
            onFocus={(e) => e.target.select()}
                            step="any"
                            min={0}
                            className="receta-cant"
                            value={l.cantidad}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setLineas((ls) =>
                                ls.map((x, i) => (i === idx ? { ...x, cantidad: v } : x))
                              );
                            }}
                          />{" "}
                          {l.unidad}
                        </td>
                        <td>{cf2.format(l.costo_promedio)} / {l.unidad}</td>
                        <td>{cf.format(l.cantidad * l.costo_promedio)}</td>
                        <td>
                          <button
                            onClick={() =>
                              setLineas((ls) => ls.filter((_, i) => i !== idx))
                            }
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receta-agregar">
                  <select
                    value={nuevoInsumoId}
                    onChange={(e) => setNuevoInsumoId(e.target.value)}
                  >
                    <option value="">— agregar insumo —</option>
                    {insumosDisponibles.map((i) => (
                      <option key={i.id_insumo} value={i.id_insumo}>
                        {i.nombre} ({i.unidad})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
            onFocus={(e) => e.target.select()}
                    step="any"
                    min={0}
                    placeholder="Cantidad"
                    value={nuevaCantidad || ""}
                    onChange={(e) => setNuevaCantidad(Number(e.target.value))}
                  />
                  <button type="button" onClick={agregarLinea} disabled={!nuevoInsumoId || nuevaCantidad <= 0}>
                    Agregar
                  </button>
                </div>

                <div className="receta-resumen">
                  <div><span>Costo</span><strong>{cf.format(costoTotal)}</strong></div>
                  <div><span>Precio de venta</span><strong>{cf.format(precio)}</strong></div>
                  <div><span>Ganancia</span><strong>{cf.format(ganancia)}</strong></div>
                  <div><span>Margen</span><strong>{pf.format(margen)}</strong></div>
                  <div className="receta-sugerido">
                    <span>
                      Precio sugerido (margen{" "}
                      <input
                        type="number"
            onFocus={(e) => e.target.select()}
                        min={0}
                        max={99}
                        className="receta-margen"
                        value={margenObjetivo}
                        onChange={(e) => setMargenObjetivo(Number(e.target.value))}
                      />
                      %)
                    </span>
                    <strong>{cf.format(precioSugerido)}</strong>
                  </div>
                </div>

                {recetaError && <div className="error-productos">{recetaError}</div>}

                <button className="receta-guardar" onClick={guardar} disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar receta"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
