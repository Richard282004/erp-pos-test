import { useEffect, useState } from "react";
import {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  reactivarCategoria,
  usoCategorias,
  type Categoria,
} from "../../api/productos";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function CategoriasPage() {
  const { accessToken } = useAuth();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [uso, setUso] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verInactivas, setVerInactivas] = useState(false);

  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = (incluirInactivas = verInactivas) => {
    setLoading(true);
    setError(null);
    Promise.all([listarCategorias(accessToken, incluirInactivas), usoCategorias(accessToken)])
      .then(([cats, u]) => {
        setCategorias(cats);
        setUso(u);
      })
      .catch((err) => setError(mensajeError(err, "Error cargando categorías")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar(verInactivas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verInactivas]);

  return (
    <div className="admin-modulo">
      <h2>Categorías</h2>

      <section className="admin-form-section">
        <h3>Nueva categoría</h3>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateError(null);
            setCreando(true);
            try {
              await crearCategoria({ nombre, descripcion: null }, accessToken);
              setNombre("");
              cargar();
            } catch (err) {
              setCreateError(mensajeError(err, "Error creando categoría"));
            } finally {
              setCreando(false);
            }
          }}
        >
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <button type="submit" disabled={creando}>
            {creando ? "Creando…" : "Crear categoría"}
          </button>
          {createError && <div className="error-productos">{createError}</div>}
        </form>
      </section>

      <section>
        <div className="admin-toolbar">
          <h3>Categorías existentes</h3>
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
          <div className="cargando">Cargando…</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id_categoria} className={c.activo === false ? "admin-fila-inactiva" : undefined}>
                  <td>{c.nombre}</td>
                  <td>{uso[c.id_categoria] ?? 0}</td>
                  <td className={c.activo === false ? "admin-estado-inactivo" : "admin-estado-activo"}>
                    {c.activo === false ? "Inactiva" : "Activa"}
                  </td>
                  <td className="admin-acciones">
                    <button
                      onClick={() => {
                        setEditId(c.id_categoria);
                        setEditNombre(c.nombre);
                        setEditError(null);
                      }}
                    >
                      Editar
                    </button>
                    {c.activo === false ? (
                      <button
                        onClick={async () => {
                          try {
                            await reactivarCategoria(c.id_categoria, accessToken);
                            cargar();
                          } catch (err) {
                            alert(mensajeError(err, "Error al reactivar"));
                          }
                        }}
                      >
                        Reactivar
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const n = uso[c.id_categoria] ?? 0;
                          const aviso =
                            n > 0
                              ? `"${c.nombre}" tiene ${n} producto(s). Se ocultará como filtro en el POS; los productos siguen a la venta. ¿Eliminar?`
                              : `¿Eliminar "${c.nombre}"?`;
                          if (!confirm(aviso)) return;
                          try {
                            await eliminarCategoria(c.id_categoria, accessToken);
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
            <h3>Editar categoría</h3>
            <label>
              Nombre
              <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
            </label>
            <div>
              <button
                disabled={guardando}
                onClick={async () => {
                  if (editId === null) return;
                  setEditError(null);
                  setGuardando(true);
                  try {
                    await actualizarCategoria(editId, { nombre: editNombre, descripcion: null }, accessToken);
                    setEditId(null);
                    cargar();
                  } catch (err) {
                    setEditError(mensajeError(err, "Error editando categoría"));
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
