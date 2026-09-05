import { useCallback, useEffect, useState } from "react";
import { ROLES, nombreRol } from "../../api/auth";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  reactivarUsuario,
  borrarUsuarioDefinitivo,
  type Usuario,
  type UsuarioInput,
  type UsuarioEditInput,
} from "../../api/usuarios";
import { listarSucursales, type Sucursal } from "../../api/sucursales";
import { useAuth } from "../../context/useAuth";
import { EditUsuarioModal } from "../../components/admin/EditUsuarioModal";
import { BotonBorrarDefinitivo } from "../../components/admin/BotonBorrarDefinitivo";
import { CampoPassword } from "../../components/common/CampoPassword";
import { useRecurso } from "../../hooks/useRecurso";
import { mensajeError } from "../../lib/errores";

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

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [verInactivos, setVerInactivos] = useState(false);

  const [form, setForm] = useState<UsuarioInput>(FORM_INICIAL);
  const [confirmar, setConfirmar] = useState("");
  const [creando, setCreando] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UsuarioEditInput>(EDIT_FORM_INICIAL);
  const [editando, setEditando] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const cargador = useCallback(() => listarUsuarios(accessToken), [accessToken]);
  const {
    datos: usuarios,
    loading,
    error,
    refetch: cargarUsuarios,
  } = useRecurso<Usuario[]>(cargador, "Error cargando usuarios", []);

  useEffect(() => {
    let ignore = false;
    listarSucursales(accessToken)
      .then((data) => {
        if (ignore) return;
        setSucursales(data);
        setForm((f) => ({ ...f, id_sucursal: data[0]?.id_sucursal ?? 0 }));
      })
      .catch((err) => console.warn("No se pudieron cargar sucursales", err));
    return () => {
      ignore = true;
    };
  }, [accessToken]);

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
            if (form.password !== confirmar) {
              setCreateError("Las contraseñas no coinciden");
              return;
            }
            setCreando(true);
            try {
              await crearUsuario(form, accessToken);
              setForm({ ...FORM_INICIAL, id_sucursal: sucursales[0]?.id_sucursal ?? 0 });
              setConfirmar("");
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
          <CampoPassword
            className="admin-campo"
            label="Contraseña"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            autoComplete="new-password"
            required
          />
          <CampoPassword
            className="admin-campo"
            label="Repetir contraseña"
            value={confirmar}
            onChange={setConfirmar}
            autoComplete="new-password"
            required
            error={
              confirmar && form.password !== confirmar ? "No coincide" : null
            }
          />
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
                        <>
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
                            Activar
                          </button>
                          <BotonBorrarDefinitivo
                            nombre={u.username}
                            onBorrar={() => borrarUsuarioDefinitivo(u.id_usuario, accessToken)}
                            onHecho={cargarUsuarios}
                          />
                        </>
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
        key={editUserId ?? "cerrado"}
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
