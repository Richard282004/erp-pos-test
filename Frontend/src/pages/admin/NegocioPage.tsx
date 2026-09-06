import { useEffect, useRef, useState } from "react";
import {
  obtenerEmpresa,
  actualizarEmpresa,
  type EmpresaInput,
} from "../../api/empresa";
import { comprimirImagen, subirLogo } from "../../api/imagenes";
import { useAuth } from "../../context/useAuth";
import { mensajeError } from "../../lib/errores";

const VACIO: EmpresaInput = {
  nombre: "",
  razon_social: null,
  rut: null,
  telefono: null,
  email: null,
  sitio_web: null,
  mensaje_ticket: null,
  login_titulo: null,
  login_subtitulo: null,
  login_logo_url: null,
  login_mostrar_logo: true,
  login_acento: null,
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
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;
    obtenerEmpresa(accessToken)
      .then((e) => {
        if (ignore) return;
        setForm({
          nombre: e.nombre,
          razon_social: e.razon_social,
          rut: e.rut,
          telefono: e.telefono,
          email: e.email,
          sitio_web: e.sitio_web,
          mensaje_ticket: e.mensaje_ticket,
          login_titulo: e.login_titulo,
          login_subtitulo: e.login_subtitulo,
          login_logo_url: e.login_logo_url,
          login_mostrar_logo: e.login_mostrar_logo,
          login_acento: e.login_acento,
        });
      })
      .catch((err) => {
        if (!ignore) setError(mensajeError(err, "Error cargando los datos del negocio"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  const campo = (label: string, key: keyof EmpresaInput, placeholder = "", ayuda?: string) => (
    <label className="admin-campo">
      <span>{label}</span>
      <input
        value={(form[key] as string | null) ?? ""}
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

  const elegirLogo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    setSubiendoLogo(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      const url = await subirLogo(comprimida, accessToken, archivo.name);
      setForm((f) => ({ ...f, login_logo_url: url }));
    } catch (err) {
      setError(mensajeError(err, "No se pudo subir el logo"));
    } finally {
      setSubiendoLogo(false);
      if (inputLogo.current) inputLogo.current.value = "";
    }
  };

  if (loading) return <div className="admin-modulo">Cargando…</div>;

  const tituloLogin = form.login_titulo?.trim() || form.nombre.trim() || "Byeburger POS";
  const acento = form.login_acento || undefined;

  return (
    <div className="admin-modulo">
      <h2>Datos del negocio</h2>

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
          <h3>Ticket del cliente</h3>
          <p className="admin-ayuda">Esto sale impreso en la cabecera del ticket.</p>
          {campo("Nombre del local", "nombre", "Byeburger")}
          {campo("Razón social", "razon_social", "Byeburger SpA")}
          {campo("RUT", "rut", "78127623-5")}
          {campo("Teléfono", "telefono", "+56 9 1234 5678")}
          {campo("Email", "email", "contacto@byeburger.cl")}
          {campo("Sitio web", "sitio_web", "https://byeburger.cl")}
          {campo("Mensaje del ticket", "mensaje_ticket", "¡GRACIAS POR TU COMPRA!", "Va al pie, después del total.")}

          <h3 className="admin-form-subtitulo">Pantalla de inicio de sesión</h3>
          <p className="admin-ayuda">Lo que ven los cajeros al entrar.</p>
          {campo("Título", "login_titulo", tituloLogin, "Si lo dejás vacío se usa el nombre del local.")}
          {campo("Subtítulo", "login_subtitulo", "Ingresá para operar la caja")}

          <label className="admin-campo admin-check-inline">
            <input
              type="checkbox"
              checked={form.login_mostrar_logo}
              onChange={(e) => setForm({ ...form, login_mostrar_logo: e.target.checked })}
            />
            <span>Mostrar el logo</span>
          </label>

          <div className="foto-producto">
            <span className="foto-producto-label">Logo</span>
            <div className="foto-producto-cuerpo">
              {form.login_logo_url ? (
                <img className="foto-producto-preview" src={form.login_logo_url} alt="Logo" />
              ) : (
                <div className="foto-producto-vacia">Sin logo</div>
              )}
              <div className="foto-producto-acciones">
                <input
                  ref={inputLogo}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => elegirLogo(e.target.files?.[0])}
                />
                <button type="button" onClick={() => inputLogo.current?.click()} disabled={subiendoLogo}>
                  {subiendoLogo ? "Subiendo…" : form.login_logo_url ? "Cambiar logo" : "Subir logo"}
                </button>
                {form.login_logo_url && (
                  <button type="button" onClick={() => setForm({ ...form, login_logo_url: null })}>
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="admin-campo">
            <span>Color de acento</span>
            <span className="admin-color-fila">
              <input
                type="color"
                value={form.login_acento || "#c98a2b"}
                onChange={(e) => setForm({ ...form, login_acento: e.target.value })}
              />
              {form.login_acento && (
                <button type="button" className="admin-color-reset" onClick={() => setForm({ ...form, login_acento: null })}>
                  Usar el del tema
                </button>
              )}
            </span>
            <small className="admin-ayuda">Botón y detalles del login. Vacío = el color del tema.</small>
          </label>

          <button type="submit" disabled={guardando || !form.nombre.trim()}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {ok && <span className="admin-ok">Guardado.</span>}
        </form>
      </section>

      <section className="admin-form-section">
        <h3>Vista previa del login</h3>
        <div
          className="login-preview"
          style={acento ? ({ "--accent": acento } as React.CSSProperties) : undefined}
        >
          <div className="login-brand">
            {form.login_mostrar_logo &&
              (form.login_logo_url ? (
                <img className="login-logo-img" src={form.login_logo_url} alt="" />
              ) : (
                <span className="login-logo-inicial">{tituloLogin.slice(0, 1).toUpperCase()}</span>
              ))}
            <h1>{tituloLogin}</h1>
            <p>{form.login_subtitulo?.trim() || "Ingresá para operar la caja"}</p>
          </div>
          <div className="login-preview-campo" />
          <div className="login-preview-campo" />
          <div className="login-preview-boton">Entrar</div>
        </div>
      </section>

      <p className="admin-ayuda">
        La dirección y el teléfono de la sucursal salen de{" "}
        <strong>Recursos → Sucursales</strong>, porque cambian según el local.
      </p>
    </div>
  );
}
