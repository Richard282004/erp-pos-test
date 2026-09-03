import { useEffect, useState } from "react";
import { ROLES, nombreRol } from "../../api/auth";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  reactivarUsuario,
  type Usuario,
  type UsuarioInput,
  type UsuarioEditInput,
} from "../../api/usuarios";
import { listarSucursales, type Sucursal } from "../../api/sucursales";
import { useAuth } from "../../context/useAuth";
import { EditUsuarioModal } from "../../components/admin/EditUsuarioModal";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const FORM_INICIAL: UsuarioInput = {
  username: "",
  password: "",
  nombre: "",
  apellido: "",
  id_rol: ROLES[0].id_rol,
  id_sucursal: 0,
};

const EDIT_FORM_INICIAL: UsuarioEditInput = {
  nombre: "",
  apellido: "",
  id_rol: ROLES[0].id_rol,
  id_sucursal: 0,
  password: "",
};

export function UsuariosPage() {
  const { accessToken, currentUser } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verInactivos, setVerInactivos] = useState(false);

  const [form, setForm] = useState<UsuarioInput>(FORM_INICIAL);
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UsuarioEditInput>(EDIT_FORM_INICIAL);
  const [editando, setEditando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const cargarUsuarios = () => {
    setLoading(true);
    setError(null);
    listarUsuarios(accessToken)
      .then((data) => setUsuarios(data))
      .catch((err) => setError(mensajeError(err, "Error cargando usuarios")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarUsuarios();
    listarSucursales(accessToken)
      .then((data) => {
        setSucursales(data);
        setForm((f) => ({ ...f, id_sucursal: data[0]?.id_sucursal ?? 0 }));
      })
      .catch((err) => console.warn("No se pudieron cargar sucursales", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombreSucursal = (id: number) => sucursales.find((s) => s.id_sucursal === id)?.nombre ?? `Sucursal ${id}`;

  const usuariosVisibles = verInactivos ? usuarios : usuarios.filter((u) => u.activo);

  return (
    <div className="admin-modulo">
      <h2>Usuarios y Roles</h2>

      <section className="admin-form-section">
        <h3>Nuevo usuario</h3>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateError(null);
            setCreando(true);
            try {
              await crearUsuario(form, accessToken);
              setForm({ ...FORM_INICIAL, id_sucursal: sucursales[0]?.id_sucursal ?? 0 });
              cargarUsuarios();
            } catch (err) {
              setCreateError(mensajeError(err, "Error creando usuario"));
            } finally {
              setCreando(false);
            }
          }}
        >
          <label>
            Usuario
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </label>
          <label>
            Apellido
            <input
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              required
            />
          </label>
          <label>
            Rol
            <select
              value={form.id_rol}
              onChange={(e) => setForm({ ...form, id_rol: Number(e.target.value) })}
            >
              {ROLES.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sucursal
            <select
              value={form.id_sucursal}
              onChange={(e) => setForm({ ...form, id_sucursal: Number(e.target.value) })}
            >
              {sucursales.map((s) => (
                <option key={s.id_sucursal} value={s.id_sucursal}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={creando}>
            {creando ? "Creando..." : "Crear usuario"}
          </button>
          {createError && <div className="error-productos">{createError}</div>}
        </form>
      </section>

      <section>
        <div className="admin-toolbar">
          <h3>Usuarios existentes</h3>
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
          <div className="cargando">Cargando usuarios...</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Sucursal</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosVisibles.map((u) => {
                const esUnoMismo = u.id_usuario === currentUser?.id_usuario;
                return (
                  <tr key={u.id_usuario} className={u.activo ? undefined : "admin-fila-inactiva"}>
                    <td>{u.username}</td>
                    <td>{u.nombre} {u.apellido}</td>
                    <td>{nombreRol({ id_rol: u.id_rol })}</td>
                    <td>{nombreSucursal(u.id_sucursal)}</td>
                    <td className={u.activo ? "admin-estado-activo" : "admin-estado-inactivo"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="admin-acciones">
                      <button
                        onClick={() => {
                          setEditUserId(u.id_usuario);
                          setEditForm({
                            nombre: u.nombre,
                            apellido: u.apellido,
                            id_rol: u.id_rol,
                            id_sucursal: u.id_sucursal,
                            password: "",
                          });
                          setEditError(null);
                        }}
                      >
                        Editar
                      </button>
                      {u.activo ? (
                        <button
                          disabled={esUnoMismo}
                          title={esUnoMismo ? "No podés eliminar tu propio usuario" : undefined}
                          onClick={async () => {
                            if (!confirm(`¿Eliminar a ${u.username}? Se ocultará; los pedidos históricos se conservan.`)) return;
                            try {
                              await desactivarUsuario(u.id_usuario, accessToken);
                              cargarUsuarios();
                            } catch (err) {
                              alert(mensajeError(err, "Error al eliminar"));
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await reactivarUsuario(u.id_usuario, accessToken);
                              cargarUsuarios();
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

      <section className="admin-roles-referencia">
        <h3>Roles del sistema</h3>
        <ul>
          {ROLES.map((r) => (
            <li key={r.id_rol}>
              <strong>{r.nombre}</strong>: {r.descripcion}
            </li>
          ))}
        </ul>
      </section>

      <EditUsuarioModal
        open={editUserId !== null}
        form={editForm}
        onChangeForm={setEditForm}
        sucursales={sucursales}
        guardando={editando}
        error={editError}
        onCancel={() => setEditUserId(null)}
        onSubmit={async () => {
          if (editUserId === null) return;
          setEditError(null);
          setEditando(true);
          try {
            const payload: UsuarioEditInput = { ...editForm };
            if (!payload.password) delete payload.password;
            await actualizarUsuario(editUserId, payload, accessToken);
            setEditUserId(null);
            cargarUsuarios();
          } catch (err) {
            setEditError(mensajeError(err, "Error editando usuario"));
          } finally {
            setEditando(false);
          }
        }}
      />
    </div>
  );
}
