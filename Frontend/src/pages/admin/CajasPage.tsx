import { useCallback, useEffect, useState } from "react";
import {
  listarCajas,
  crearCaja,
  actualizarCaja,
  eliminarCaja,
  reactivarCaja,
  borrarCajaDefinitivo,
  type Caja,
} from "../../api/caja";
import { listarSucursales, type Sucursal } from "../../api/sucursales";
import { useAuth } from "../../context/useAuth";
import { BotonBorrarDefinitivo } from "../../components/admin/BotonBorrarDefinitivo";
import { useRecurso } from "../../hooks/useRecurso";
import { mensajeError } from "../../lib/errores";

export function CajasPage() {
  const { accessToken } = useAuth();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [verInactivas, setVerInactivas] = useState(false);

  const [nombre, setNombre] = useState("");
  const [idSucursal, setIdSucursal] = useState<number | "">("");
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", id_sucursal: 0 });
  const [editError, setEditError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const nombreSucursal = (id: number) =>
    sucursales.find((s) => s.id_sucursal === id)?.nombre ?? `Sucursal ${id}`;

  const cargador = useCallback(
    () => listarCajas(accessToken, verInactivas),
    [accessToken, verInactivas],
  );
  const {
    datos: cajas,
    loading,
    error,
    refetch: cargar,
  } = useRecurso<Caja[]>(cargador, "Error cargando cajas", []);

  useEffect(() => {
    let ignore = false;
    listarSucursales(accessToken)
      .then((s) => {
        if (!ignore) setSucursales(s);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  return (
    <div className="admin-modulo">
      <h2>Cajas</h2>

      <section className="admin-form-section">
        <h3>Nueva caja</h3>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (idSucursal === "") return;
            setCreateError(null);
            setCreando(true);
            try {
              await crearCaja({ nombre, id_sucursal: idSucursal }, accessToken);
              setNombre("");
              setIdSucursal("");
              cargar();
            } catch (err) {
              setCreateError(mensajeError(err, "Error creando caja"));
            } finally {
              setCreando(false);
            }
          }}
        >
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label>
            Sucursal
            <select
              value={idSucursal}
              onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">— elegir —</option>
              {sucursales.map((s) => (
                <option key={s.id_sucursal} value={s.id_sucursal}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={creando}>
            {creando ? "Creando…" : "Crear caja"}
          </button>
          {createError && <div className="error-productos">{createError}</div>}
        </form>
      </section>

      <section>
        <div className="admin-toolbar">
          <h3>Cajas existentes</h3>
          <label className="admin-toggle-inactivos">
            <input
              type="checkbox"
              checked={verInactivas}
              onChange={(e) => setVerInactivas(e.target.checked)}
            />
            Ver inactivas
          </label>
        </div>

        {loading ? (
          <div className="cargando">Cargando cajas…</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : cajas.length === 0 ? (
          <p className="admin-stub">Todavía no hay cajas. Creá la primera arriba.</p>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Caja</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cajas.map((c) => (
                <tr key={c.id_caja} className={c.activo === false ? "admin-fila-inactiva" : undefined}>
                  <td>{c.nombre}</td>
                  <td>{c.sucursal ?? nombreSucursal(c.id_sucursal)}</td>
                  <td className={c.activo === false ? "admin-estado-inactivo" : "admin-estado-activo"}>
                    {c.activo === false ? "Inactiva" : "Activa"}
                  </td>
                  <td className="admin-acciones">
                    <button
                      onClick={() => {
                        setEditId(c.id_caja);
                        setEditForm({ nombre: c.nombre, id_sucursal: c.id_sucursal });
                        setEditError(null);
                      }}
                    >
                      Editar
                    </button>
                    {c.activo === false ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await reactivarCaja(c.id_caja, accessToken);
                              cargar();
                            } catch (err) {
                              alert(mensajeError(err, "Error al reactivar"));
                            }
                          }}
                        >
                          Activar
                        </button>
                        <BotonBorrarDefinitivo
                          nombre={c.nombre}
                          onBorrar={() => borrarCajaDefinitivo(c.id_caja, accessToken)}
                          onHecho={cargar}
                        />
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar "${c.nombre}"? Se ocultará; el historial de turnos se conserva.`)) return;
                          try {
                            await eliminarCaja(c.id_caja, accessToken);
                            cargar();
                          } catch (err) {
                            alert(mensajeError(err, "Error al eliminar"));
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editId !== null && (
        <div className="admin-modal" onClick={() => setEditId(null)}>
          <div className="admin-modal-form" onClick={(e) => e.stopPropagation()}>
            <h3>Editar caja</h3>
            <label>
              Nombre
              <input
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />
            </label>
            <label>
              Sucursal
              <select
                value={editForm.id_sucursal}
                onChange={(e) => setEditForm({ ...editForm, id_sucursal: Number(e.target.value) })}
              >
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button
                disabled={guardando}
                onClick={async () => {
                  if (editId === null) return;
                  setEditError(null);
                  setGuardando(true);
                  try {
                    await actualizarCaja(editId, editForm, accessToken);
                    setEditId(null);
                    cargar();
                  } catch (err) {
                    setEditError(mensajeError(err, "Error editando caja"));
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
    </div>
  );
}
