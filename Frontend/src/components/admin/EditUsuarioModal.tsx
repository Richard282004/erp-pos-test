import { ROLES } from "../../api/auth";
import type { UsuarioEditInput } from "../../api/usuarios";
import type { Sucursal } from "../../api/sucursales";

export function EditUsuarioModal({
  open,
  form,
  onChangeForm,
  sucursales,
  guardando,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  form: UsuarioEditInput;
  onChangeForm: (f: UsuarioEditInput) => void;
  sucursales: Sucursal[];
  guardando: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="admin-modal">
      <div className="admin-modal-form">
        <h3>Editar usuario</h3>
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => onChangeForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>
          Apellido
          <input value={form.apellido} onChange={(e) => onChangeForm({ ...form, apellido: e.target.value })} />
        </label>
        <label>
          Rol
          <select
            value={form.id_rol}
            onChange={(e) => onChangeForm({ ...form, id_rol: Number(e.target.value) })}
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
            onChange={(e) => onChangeForm({ ...form, id_sucursal: Number(e.target.value) })}
          >
            {sucursales.map((s) => (
              <option key={s.id_sucursal} value={s.id_sucursal}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Contraseña nueva
          <input
            type="password"
            value={form.password ?? ""}
            onChange={(e) => onChangeForm({ ...form, password: e.target.value })}
            placeholder="Dejar vacío para no cambiar"
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <button onClick={onSubmit} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>
            Cancelar
          </button>
        </div>
        {error && <div className="error-productos">{error}</div>}
      </div>
    </div>
  );
}
