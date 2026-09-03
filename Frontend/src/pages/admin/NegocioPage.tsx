import { useEffect, useState } from "react";
import {
  obtenerEmpresa,
  actualizarEmpresa,
  type EmpresaInput,
} from "../../api/empresa";
import { useAuth } from "../../context/useAuth";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const VACIO: EmpresaInput = {
  nombre: "",
  razon_social: null,
  rut: null,
  telefono: null,
  email: null,
  sitio_web: null,
  mensaje_ticket: null,
};

/** Campos de texto libre: null cuando quedan vacíos, para no guardar "". */
const limpiar = (v: string) => (v.trim() === "" ? null : v.trim());

export function NegocioPage() {
  const { accessToken } = useAuth();

  const [form, setForm] = useState<EmpresaInput>(VACIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    obtenerEmpresa(accessToken)
      .then((e) =>
        setForm({
          nombre: e.nombre,
          razon_social: e.razon_social,
          rut: e.rut,
          telefono: e.telefono,
          email: e.email,
          sitio_web: e.sitio_web,
          mensaje_ticket: e.mensaje_ticket,
        })
      )
      .catch((err) => setError(mensajeError(err, "Error cargando los datos del negocio")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campo = (
    label: string,
    key: keyof EmpresaInput,
    placeholder = "",
    ayuda?: string
  ) => (
    <label className="admin-campo">
      <span>{label}</span>
      <input
        value={form[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) =>
          setForm({
            ...form,
            [key]: key === "nombre" ? e.target.value : limpiar(e.target.value),
          })
        }
      />
      {ayuda && <small className="admin-ayuda">{ayuda}</small>}
    </label>
  );

  if (loading) return <div className="admin-modulo">Cargando…</div>;

  return (
    <div className="admin-modulo">
      <h2>Datos del negocio</h2>
      <p className="admin-ayuda">
        Esto es lo que sale impreso en la cabecera del ticket del cliente.
      </p>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-form-section">
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setOk(false);
            setGuardando(true);
            try {
              await actualizarEmpresa(form, accessToken);
              setOk(true);
            } catch (err) {
              setError(mensajeError(err, "Error guardando"));
            } finally {
              setGuardando(false);
            }
          }}
        >
          {campo("Nombre del local", "nombre", "Byeburger")}
          {campo("Razón social", "razon_social", "Byeburger SpA")}
          {campo("RUT", "rut", "78127623-5")}
          {campo("Teléfono", "telefono", "+56 9 1234 5678")}
          {campo("Email", "email", "contacto@byeburger.cl")}
          {campo("Sitio web", "sitio_web", "https://byeburger.cl")}
          {campo(
            "Mensaje del ticket",
            "mensaje_ticket",
            "¡GRACIAS POR TU COMPRA!",
            "Va al pie, después del total."
          )}

          <button type="submit" disabled={guardando || !form.nombre.trim()}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {ok && <span className="admin-ok">Guardado.</span>}
        </form>
      </section>

      <p className="admin-ayuda">
        La dirección y el teléfono de la sucursal salen de{" "}
        <strong>Recursos → Sucursales</strong>, porque cambian según el local.
      </p>
    </div>
  );
}
