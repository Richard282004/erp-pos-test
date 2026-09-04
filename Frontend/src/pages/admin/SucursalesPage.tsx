import { useEffect, useState } from "react";
import {
  listarSucursales,
  crearSucursal,
  actualizarSucursal,
  desactivarSucursal,
  reactivarSucursal,
  borrarSucursalDefinitivo,
  type Sucursal,
  type SucursalInput,
} from "../../api/sucursales";
import { useAuth } from "../../context/useAuth";
import { SucursalModal } from "../../components/admin/SucursalModal";
import { BotonBorrarDefinitivo } from "../../components/admin/BotonBorrarDefinitivo";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const FORM_INICIAL: SucursalInput = {
  nombre: "",
  direccion: null,
  comuna: null,
  telefono: null,
};

export function SucursalesPage() {
  const { accessToken } = useAuth();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verInactivas, setVerInactivas] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSucursalId, setEditingSucursalId] = useState<number | null>(null);
  const [form, setForm] = useState<SucursalInput>(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const cargarSucursales = (incluirInactivas = verInactivas) => {
    setLoading(true);
    setError(null);
    listarSucursales(accessToken, incluirInactivas)
      .then((data) => setSucursales(data))
      .catch((err) => setError(mensajeError(err, "Error cargando sucursales")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarSucursales(verInactivas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verInactivas]);

  return (
    <div className="admin-modulo">
      <h2>Sucursales</h2>

      <section className="admin-form-section admin-toolbar">
        <button
          onClick={() => {
            setEditingSucursalId(null);
            setForm(FORM_INICIAL);
            setModalError(null);
            setModalOpen(true);
          }}
        >
          + Nueva sucursal
        </button>
        <label className="admin-toggle-inactivos">
          <input
            type="checkbox"
            checked={verInactivas}
            onChange={(e) => setVerInactivas(e.target.checked)}
          />
          Ver inactivas
        </label>
      </section>

      <section>
        <h3>Sucursales existentes</h3>
        {loading ? (
          <div className="cargando">Cargando sucursales...</div>
        ) : error ? (
          <div className="error-productos">{error}</div>
        ) : (
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Comuna</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map((s) => (
                <tr key={s.id_sucursal} className={s.activo ? undefined : "admin-fila-inactiva"}>
                  <td>{s.nombre}</td>
                  <td>{s.direccion}</td>
                  <td>{s.comuna}</td>
                  <td>{s.telefono}</td>
                  <td className="admin-acciones">
                    <button
                      onClick={() => {
                        setEditingSucursalId(s.id_sucursal);
                        setForm({
                          nombre: s.nombre,
                          direccion: s.direccion,
                          comuna: s.comuna,
                          telefono: s.telefono,
                        });
                        setModalError(null);
                        setModalOpen(true);
                      }}
                    >
                      Editar
                    </button>
                    {s.activo ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar ${s.nombre}? Se ocultará; los pedidos históricos se conservan.`)) return;
                          try {
                            await desactivarSucursal(s.id_sucursal, accessToken);
                            cargarSucursales();
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
                              await reactivarSucursal(s.id_sucursal, accessToken);
                              cargarSucursales();
                            } catch (err) {
                              alert(mensajeError(err, "Error al reactivar"));
                            }
                          }}
                        >
                          Activar
                        </button>
                        <BotonBorrarDefinitivo
                          nombre={s.nombre}
                          onBorrar={() => borrarSucursalDefinitivo(s.id_sucursal, accessToken)}
                          onHecho={cargarSucursales}
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

      <SucursalModal
        open={modalOpen}
        form={form}
        onChangeForm={setForm}
        editingSucursalId={editingSucursalId}
        guardando={guardando}
        error={modalError}
        onCancel={() => setModalOpen(false)}
        onSubmit={async () => {
          setModalError(null);
          setGuardando(true);
          try {
            if (editingSucursalId) {
              await actualizarSucursal(editingSucursalId, form, accessToken);
            } else {
              await crearSucursal(form, accessToken);
            }
            setModalOpen(false);
            cargarSucursales();
          } catch (err) {
            setModalError(mensajeError(err, "Error guardando sucursal"));
          } finally {
            setGuardando(false);
          }
        }}
      />
    </div>
  );
}
