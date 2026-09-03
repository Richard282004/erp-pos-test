import type { SucursalInput } from "../../api/sucursales";

export function SucursalModal({
  open,
  form,
  onChangeForm,
  editingSucursalId,
  guardando,
  error,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  form: SucursalInput;
  onChangeForm: (f: SucursalInput) => void;
  editingSucursalId: number | null;
  guardando: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="admin-modal">
      <div className="admin-modal-form">
        <h3>{editingSucursalId ? "Editar sucursal" : "Nueva sucursal"}</h3>
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => onChangeForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>
          Dirección
          <input
            value={form.direccion ?? ""}
            onChange={(e) => onChangeForm({ ...form, direccion: e.target.value || null })}
          />
        </label>
        <label>
          Comuna
          <input
            value={form.comuna ?? ""}
            onChange={(e) => onChangeForm({ ...form, comuna: e.target.value || null })}
          />
        </label>
        <label>
          Teléfono
          <input
            value={form.telefono ?? ""}
            onChange={(e) => onChangeForm({ ...form, telefono: e.target.value || null })}
          />
        </label>

        <div style={{ marginTop: 8 }}>
          <button onClick={onSubmit} disabled={guardando}>
            {guardando ? "Guardando..." : editingSucursalId ? "Guardar cambios" : "Crear sucursal"}
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
