import { useEffect, useState } from "react";
import {
  listarInsumos,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  reactivarInsumo,
  etiquetaUnidad,
  type Insumo,
  type InsumoCreate,
  type UnidadBase,
} from "../../api/insumos";
import { registrarMovimiento } from "../../api/inventario";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 });
const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 2,
});

const FORM_INICIAL: InsumoCreate = { nombre: "", unidad: "g", stock_minimo: 0 };

export function InsumosPage() {
  const { accessToken } = useAuth();

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);

  const [form, setForm] = useState<InsumoCreate>(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // modal editar
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", stock_minimo: 0 });
  const [editError, setEditError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // modal movimiento (ajuste / merma)
  const [movInsumo, setMovInsumo] = useState<Insumo | null>(null);
  const [movForm, setMovForm] = useState<{ tipo: "AJUSTE" | "MERMA"; cantidad: number; nota: string }>({
    tipo: "AJUSTE",
    cantidad: 0,
    nota: "",
  });
  const [movError, setMovError] = useState<string | null>(null);
  const [movGuardando, setMovGuardando] = useState(false);

  const cargar = (incluirInactivos = verInactivos) => {
    setLoading(true);
    setError(null);
    listarInsumos(accessToken, incluirInactivos)
      .then(setInsumos)
      .catch((err) => setError(mensajeError(err, "Error cargando insumos")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar(verInactivos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verInactivos]);

  return (
    <div className="admin-modulo">
      <h2>Insumos</h2>

      <section className="admin-form-section">
        <h3>Nuevo insumo</h3>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateError(null);
            setCreando(true);
            try {
              await crearInsumo(form, accessToken);
              setForm(FORM_INICIAL);
              cargar();
            } catch (err) {
              setCreateError(mensajeError(err, "Error creando insumo"));
            } finally {
              setCreando(false);
            }
          }}
        >
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </label>
          <label>
            Unidad base
            <select
              value={form.unidad}
              onChange={(e) => setForm({ ...form, unidad: e.target.value as UnidadBase })}
            >
              <option value="g">gramos (g)</option>
              <option value="ml">mililitros (ml)</option>
              <option value="u">unidades (u)</option>
            </select>
          </label>
          <label>
            Stock mínimo
            <input
              type="number"
              min={0}
              step="any"
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: Number(e.target.value) })}
            />
          </label>
          <button type="submit" disabled={creando}>
            {creando ? "Creando…" : "Crear insumo"}
          </button>
          {createError && <div className="error-productos">{createError}</div>}
        </form>
      </section>

      <section>
        <div className="admin-toolbar">
          <h3>Insumos existentes</h3>
          <label className="admin-toggle-inactivos">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
            />
            Ver inactivos
          </label>
        </div>

        {loading ? (
          <div className="cargando">Cargando insumos…</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : insumos.length === 0 ? (
          <p className="admin-stub">Todavía no hay insumos. Creá el primero arriba.</p>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Costo prom.</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const bajo = i.stock_actual < i.stock_minimo;
                return (
                  <tr key={i.id_insumo} className={i.activo ? undefined : "admin-fila-inactiva"}>
                    <td>{i.nombre}</td>
                    <td>{etiquetaUnidad(i.unidad)}</td>
                    <td className={bajo ? "admin-estado-inactivo" : undefined}>
                      {nf.format(i.stock_actual)} {i.unidad}
                    </td>
                    <td>{nf.format(i.stock_minimo)} {i.unidad}</td>
                    <td>{cf.format(i.costo_promedio)} / {i.unidad}</td>
                    <td className={i.activo ? "admin-estado-activo" : "admin-estado-inactivo"}>
                      {i.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="admin-acciones">
                      <button
                        onClick={() => {
                          setEditId(i.id_insumo);
                          setEditForm({ nombre: i.nombre, stock_minimo: i.stock_minimo });
                          setEditError(null);
                        }}
                      >
                        Editar
                      </button>
                      {i.activo ? (
                        <>
                          <button
                            onClick={() => {
                              setMovInsumo(i);
                              setMovForm({ tipo: "AJUSTE", cantidad: 0, nota: "" });
                              setMovError(null);
                            }}
                          >
                            Ajuste / merma
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar "${i.nombre}"? Se ocultará; el historial se conserva.`)) return;
                              try {
                                await eliminarInsumo(i.id_insumo, accessToken);
                                cargar();
                              } catch (err) {
                                alert(mensajeError(err, "Error al eliminar"));
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await reactivarInsumo(i.id_insumo, accessToken);
                              cargar();
                            } catch (err) {
                              alert(mensajeError(err, "Error al reactivar"));
                            }
                          }}
                        >
                          Reactivar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {editId !== null && (
        <div className="admin-modal" onClick={() => setEditId(null)}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Editar insumo</h3>
            <label>
              Nombre
              <input
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />
            </label>
            <label>
              Stock mínimo
              <input
                type="number"
                min={0}
                step="any"
                value={editForm.stock_minimo}
                onChange={(e) => setEditForm({ ...editForm, stock_minimo: Number(e.target.value) })}
              />
            </label>
            <p className="admin-nota-modal">
              El stock y el costo se ajustan con compras o con un movimiento de ajuste/merma, no acá.
            </p>
            <div>
              <button
                disabled={guardando}
                onClick={async () => {
                  if (editId === null) return;
                  setEditError(null);
                  setGuardando(true);
                  try {
                    await actualizarInsumo(editId, editForm, accessToken);
                    setEditId(null);
                    cargar();
                  } catch (err) {
                    setEditError(mensajeError(err, "Error editando insumo"));
                  } finally {
                    setGuardando(false);
                  }
                }}
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={() => setEditId(null)} style={{ marginLeft: 8 }}>
                Cancelar
              </button>
            </div>
            {editError && <div className="error-productos">{editError}</div>}
          </div>
        </div>
      )}

      {movInsumo && (
        <div className="admin-modal" onClick={() => setMovInsumo(null)}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Ajuste / merma — {movInsumo.nombre}</h3>
            <label>
              Tipo
              <select
                value={movForm.tipo}
                onChange={(e) =>
                  setMovForm({ ...movForm, tipo: e.target.value as "AJUSTE" | "MERMA" })
                }
              >
                <option value="AJUSTE">Ajuste (corrige contra conteo físico, + o −)</option>
                <option value="MERMA">Merma (pérdida, se descuenta)</option>
              </select>
            </label>
            <label>
              Cantidad ({movInsumo.unidad}){movForm.tipo === "AJUSTE" ? " — puede ser negativa" : ""}
              <input
                type="number"
                step="any"
                value={movForm.cantidad}
                onChange={(e) => setMovForm({ ...movForm, cantidad: Number(e.target.value) })}
              />
            </label>
            <label>
              Nota
              <input
                value={movForm.nota}
                onChange={(e) => setMovForm({ ...movForm, nota: e.target.value })}
                placeholder="Ej: se quemó en plancha / conteo semanal"
              />
            </label>
            <div>
              <button
                disabled={movGuardando}
                onClick={async () => {
                  if (!movInsumo) return;
                  setMovError(null);
                  setMovGuardando(true);
                  try {
                    await registrarMovimiento(
                      {
                        id_insumo: movInsumo.id_insumo,
                        tipo: movForm.tipo,
                        cantidad: movForm.cantidad,
                        nota: movForm.nota || null,
                      },
                      accessToken
                    );
                    setMovInsumo(null);
                    cargar();
                  } catch (err) {
                    setMovError(mensajeError(err, "Error registrando el movimiento"));
                  } finally {
                    setMovGuardando(false);
                  }
                }}
              >
                {movGuardando ? "Registrando…" : "Registrar"}
              </button>
              <button onClick={() => setMovInsumo(null)} style={{ marginLeft: 8 }}>
                Cancelar
              </button>
            </div>
            {movError && <div className="error-productos">{movError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
