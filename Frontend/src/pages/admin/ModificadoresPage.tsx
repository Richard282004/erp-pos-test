import { useEffect, useMemo, useState } from "react";
import {
  listarModificadores,
  crearModificador,
  actualizarModificador,
  eliminarModificador,
  reactivarModificador,
  borrarModificadorDefinitivo,
  modificadoresPorProducto,
  setModificadoresProducto,
  type Modificador,
  type ModificadorInput,
  type TipoModificador,
} from "../../api/modificadores";
import { listarProductosConCosto, type ProductoCosto } from "../../api/productos";
import { useAuth } from "../../context/useAuth";
import { BotonBorrarDefinitivo } from "../../components/admin/BotonBorrarDefinitivo";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const cf = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const FORM_INICIAL: ModificadorInput = { nombre: "", tipo: "AGREGAR", precio_adicional: 0 };

export function ModificadoresPage() {
  const { accessToken } = useAuth();

  const [mods, setMods] = useState<Modificador[]>([]);
  const [productos, setProductos] = useState<ProductoCosto[]>([]);
  const [asoc, setAsoc] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);

  const [form, setForm] = useState<ModificadorInput>(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ModificadorInput>(FORM_INICIAL);
  const [editError, setEditError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [selProd, setSelProd] = useState<number | null>(null);
  const [selMods, setSelMods] = useState<number[]>([]);
  const [guardandoAsoc, setGuardandoAsoc] = useState(false);

  const modsActivos = useMemo(() => mods.filter((m) => m.activo), [mods]);

  const cargar = (incluirInactivos = verInactivos) => {
    setLoading(true);
    setError(null);
    Promise.all([
      listarModificadores(accessToken, incluirInactivos),
      listarProductosConCosto(accessToken),
      modificadoresPorProducto(accessToken),
    ])
      .then(([m, p, a]) => {
        setMods(m);
        setProductos(p);
        setAsoc(a);
      })
      .catch((err) => setError(mensajeError(err, "Error cargando datos")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar(verInactivos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verInactivos]);

  const elegirProducto = (id: number) => {
    setSelProd(id);
    setSelMods(asoc[id] ?? []);
  };

  const toggleMod = (id: number) =>
    setSelMods((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="admin-modulo">
      <h2>Modificadores</h2>
      <p className="admin-nota-modal">
        Adicionales y opciones que se eligen al agregar un producto al carrito
        (ej. “Extra queso”, “Sin cebolla”).
      </p>

      <section className="admin-form-section">
        <h3>Nuevo modificador</h3>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateError(null);
            setCreando(true);
            try {
              await crearModificador(form, accessToken);
              setForm(FORM_INICIAL);
              cargar();
            } catch (err) {
              setCreateError(mensajeError(err, "Error creando modificador"));
            } finally {
              setCreando(false);
            }
          }}
        >
          <label>
            Nombre
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </label>
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoModificador })}>
              <option value="AGREGAR">Agregar (suma precio)</option>
              <option value="QUITAR">Quitar (sin costo)</option>
            </select>
          </label>
          <label>
            Precio adicional
            <input
              type="number"
            onFocus={(e) => e.target.select()}
              min={0}
              step="any"
              value={form.precio_adicional}
              onChange={(e) => setForm({ ...form, precio_adicional: Number(e.target.value) })}
              disabled={form.tipo === "QUITAR"}
            />
          </label>
          <button type="submit" disabled={creando}>
            {creando ? "Creando…" : "Crear modificador"}
          </button>
          {createError && <div className="error-productos">{createError}</div>}
        </form>
      </section>

      <section>
        <div className="admin-toolbar">
          <h3>Modificadores existentes</h3>
          <label className="admin-toggle-inactivos">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
            Ver inactivos
          </label>
        </div>

        {loading ? (
          <div className="cargando">Cargando…</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : mods.length === 0 ? (
          <p className="admin-stub">Todavía no hay modificadores.</p>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Modificador</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mods.map((m) => (
                <tr key={m.id_modificador} className={m.activo ? undefined : "admin-fila-inactiva"}>
                  <td>{m.nombre}</td>
                  <td>{m.tipo === "AGREGAR" ? "Agregar" : "Quitar"}</td>
                  <td>{m.precio_adicional > 0 ? cf.format(m.precio_adicional) : "—"}</td>
                  <td className={m.activo ? "admin-estado-activo" : "admin-estado-inactivo"}>
                    {m.activo ? "Activo" : "Inactivo"}
                  </td>
                  <td className="admin-acciones">
                    <button
                      onClick={() => {
                        setEditId(m.id_modificador);
                        setEditForm({ nombre: m.nombre, tipo: m.tipo, precio_adicional: m.precio_adicional });
                        setEditError(null);
                      }}
                    >
                      Editar
                    </button>
                    {m.activo ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar "${m.nombre}"? Se quita de todos los productos.`)) return;
                          try {
                            await eliminarModificador(m.id_modificador, accessToken);
                            cargar();
                          } catch (err) {
                            alert(mensajeError(err, "Error al eliminar"));
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await reactivarModificador(m.id_modificador, accessToken);
                              cargar();
                            } catch (err) {
                              alert(mensajeError(err, "Error al reactivar"));
                            }
                          }}
                        >
                          Activar
                        </button>
                        <BotonBorrarDefinitivo
                          nombre={m.nombre}
                          onBorrar={() => borrarModificadorDefinitivo(m.id_modificador, accessToken)}
                          onHecho={cargar}
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Asignar a productos</h3>
        {productos.length === 0 ? (
          <p className="admin-stub">No hay productos.</p>
        ) : (
          <div className="receta-layout">
            <div className="receta-productos">
              <ul>
                {productos.map((p) => (
                  <li key={p.id_producto}>
                    <button
                      className={"receta-prod" + (p.id_producto === selProd ? " activo" : "")}
                      onClick={() => elegirProducto(p.id_producto)}
                    >
                      <span className="receta-prod-nombre">{p.nombre}</span>
                      <span className="receta-prod-meta">
                        {(asoc[p.id_producto]?.length ?? 0)} modificador(es)
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="receta-editor">
              {selProd === null ? (
                <p className="admin-stub">Elegí un producto para asignarle modificadores.</p>
              ) : modsActivos.length === 0 ? (
                <p className="admin-stub">Creá modificadores primero.</p>
              ) : (
                <>
                  <div className="mod-checklist">
                    {modsActivos.map((m) => (
                      <label key={m.id_modificador} className="mod-check">
                        <input
                          type="checkbox"
                          checked={selMods.includes(m.id_modificador)}
                          onChange={() => toggleMod(m.id_modificador)}
                        />
                        <span>
                          {m.nombre}
                          {m.precio_adicional > 0 && <em> +{cf.format(m.precio_adicional)}</em>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="receta-guardar"
                    disabled={guardandoAsoc}
                    onClick={async () => {
                      if (selProd === null) return;
                      setGuardandoAsoc(true);
                      try {
                        await setModificadoresProducto(selProd, selMods, accessToken);
                        setAsoc((a) => ({ ...a, [selProd]: selMods }));
                      } catch (err) {
                        alert(mensajeError(err, "Error guardando"));
                      } finally {
                        setGuardandoAsoc(false);
                      }
                    }}
                  >
                    {guardandoAsoc ? "Guardando…" : "Guardar asignación"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {editId !== null && (
        <div className="admin-modal" onClick={() => setEditId(null)}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Editar modificador</h3>
            <label>
              Nombre
              <input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
            </label>
            <label>
              Tipo
              <select value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as TipoModificador })}>
                <option value="AGREGAR">Agregar</option>
                <option value="QUITAR">Quitar</option>
              </select>
            </label>
            <label>
              Precio adicional
              <input
                type="number"
            onFocus={(e) => e.target.select()}
                min={0}
                step="any"
                value={editForm.precio_adicional}
                onChange={(e) => setEditForm({ ...editForm, precio_adicional: Number(e.target.value) })}
                disabled={editForm.tipo === "QUITAR"}
              />
            </label>
            <div>
              <button
                disabled={guardando}
                onClick={async () => {
                  if (editId === null) return;
                  setEditError(null);
                  setGuardando(true);
                  try {
                    await actualizarModificador(
                      editId,
                      { ...editForm, precio_adicional: editForm.tipo === "QUITAR" ? 0 : editForm.precio_adicional },
                      accessToken
                    );
                    setEditId(null);
                    cargar();
                  } catch (err) {
                    setEditError(mensajeError(err, "Error editando"));
                  } finally {
                    setGuardando(false);
                  }
                }}
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={() => setEditId(null)} style={{ marginLeft: 8 }}>Cancelar</button>
            </div>
            {editError && <div className="error-productos">{editError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
