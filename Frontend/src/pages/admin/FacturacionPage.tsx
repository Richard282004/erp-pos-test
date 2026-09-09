import { useEffect, useState } from "react";
import {
  obtenerConfigDte,
  guardarConfigDte,
  probarConfigDte,
  PROVEEDORES_DTE,
  TIPOS_DOC_DTE,
  type ConfigDTEInput,
} from "../../api/dte";
import { useAuth } from "../../context/useAuth";
import { mensajeError } from "../../lib/errores";

const VACIO: ConfigDTEInput = {
  activado: false,
  proveedor: null,
  ambiente: "certificacion",
  api_url: null,
  api_token: null,
  rut_emisor: null,
  razon_social: null,
  giro: null,
  codigo_actividad: null,
  direccion_casa_matriz: null,
  comuna_casa_matriz: null,
  tipo_documento_default: 39,
  resolucion_numero: null,
  resolucion_fecha: null,
};

const limpiar = (v: string) => (v.trim() === "" ? null : v.trim());

export function FacturacionPage() {
  const { accessToken } = useAuth();

  const [form, setForm] = useState<ConfigDTEInput>(VACIO);
  const [tokenGuardado, setTokenGuardado] = useState(false);
  const [tokenMascara, setTokenMascara] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [prueba, setPrueba] = useState<{ ok: boolean; detalle: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    obtenerConfigDte(accessToken)
      .then((c) => {
        if (ignore) return;
        setForm({
          activado: c.activado,
          proveedor: c.proveedor,
          ambiente: c.ambiente,
          api_url: c.api_url,
          api_token: null,
          rut_emisor: c.rut_emisor,
          razon_social: c.razon_social,
          giro: c.giro,
          codigo_actividad: c.codigo_actividad,
          direccion_casa_matriz: c.direccion_casa_matriz,
          comuna_casa_matriz: c.comuna_casa_matriz,
          tipo_documento_default: c.tipo_documento_default,
          resolucion_numero: c.resolucion_numero,
          resolucion_fecha: c.resolucion_fecha,
        });
        setTokenGuardado(c.api_token_configurado);
        setTokenMascara(c.api_token);
      })
      .catch((err) => {
        if (!ignore) setError(mensajeError(err, "Error cargando la configuración"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  const set = <K extends keyof ConfigDTEInput>(key: K, valor: ConfigDTEInput[K]) =>
    setForm((f) => ({ ...f, [key]: valor }));

  const campo = (
    label: string,
    key: keyof ConfigDTEInput,
    placeholder = "",
    ayuda?: string,
  ) => (
    <label className="admin-campo">
      <span>{label}</span>
      <input
        value={(form[key] as string | null) ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(key, limpiar(e.target.value) as ConfigDTEInput[typeof key])}
      />
      {ayuda && <small className="admin-ayuda">{ayuda}</small>}
    </label>
  );

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    setPrueba(null);
    setGuardando(true);
    try {
      const c = await guardarConfigDte(form, accessToken);
      setTokenGuardado(c.api_token_configurado);
      setTokenMascara(c.api_token);
      setForm((f) => ({ ...f, api_token: null }));
      setOk(true);
    } catch (err) {
      setError(mensajeError(err, "Error guardando"));
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    setError(null);
    setPrueba(null);
    setProbando(true);
    try {
      setPrueba(await probarConfigDte(accessToken));
    } catch (err) {
      setError(mensajeError(err, "No se pudo probar la conexión"));
    } finally {
      setProbando(false);
    }
  };

  if (loading) return <div className="admin-modulo">Cargando…</div>;

  return (
    <div className="admin-modulo">
      <h2>Facturación electrónica</h2>

      <div className="admin-aviso">
        <strong>La emisión de documentos tributarios todavía no está activa.</strong>
        <p>
          Este módulo deja la configuración lista. Mientras tanto, el POS emite
          comprobantes internos (no válidos ante el SII). La emisión real de
          boletas y facturas se habilita en una próxima versión.
        </p>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-form-section">
        <form className="admin-form" onSubmit={guardar}>
          <label className="admin-check-inline">
            <input
              type="checkbox"
              checked={form.activado}
              onChange={(e) => set("activado", e.target.checked)}
            />
            <span>Activar facturación electrónica</span>
          </label>
          <small className="admin-ayuda">
            No se puede activar sin completar proveedor, URL, token, RUT y datos
            de la resolución del SII.
          </small>

          <h3>Proveedor</h3>
          <label className="admin-campo">
            <span>Proveedor de DTE</span>
            <select
              value={form.proveedor ?? ""}
              onChange={(e) => set("proveedor", e.target.value || null)}
            >
              <option value="">— Elegir —</option>
              {PROVEEDORES_DTE.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-campo">
            <span>Ambiente</span>
            <select
              value={form.ambiente}
              onChange={(e) =>
                set("ambiente", e.target.value as ConfigDTEInput["ambiente"])
              }
            >
              <option value="certificacion">Certificación (pruebas)</option>
              <option value="produccion">Producción</option>
            </select>
            <small className="admin-ayuda">
              Empezá siempre en Certificación. En Producción los documentos son
              reales ante el SII.
            </small>
          </label>

          {campo("URL de la API", "api_url", "https://api.proveedor.cl")}

          <label className="admin-campo">
            <span>Token de API</span>
            <input
              type="password"
              value={form.api_token ?? ""}
              placeholder={tokenGuardado ? `Guardado (${tokenMascara})` : "Pegá el token del proveedor"}
              onChange={(e) => set("api_token", e.target.value || null)}
            />
            <small className="admin-ayuda">
              {tokenGuardado
                ? "Dejalo vacío para conservar el token guardado."
                : "El proveedor lo entrega en su panel."}
            </small>
          </label>

          <h3>Datos del emisor</h3>
          {campo("RUT del emisor", "rut_emisor", "76543210-K")}
          {campo("Razón social", "razon_social", "Mi Local SpA")}
          {campo("Giro", "giro", "Venta de comida preparada")}
          {campo("Código de actividad económica", "codigo_actividad", "561000", "El que figura en el SII.")}
          {campo("Dirección casa matriz", "direccion_casa_matriz", "Av. Siempre Viva 742")}
          {campo("Comuna casa matriz", "comuna_casa_matriz", "Providencia")}

          <h3>Documento y resolución</h3>
          <label className="admin-campo">
            <span>Documento por defecto</span>
            <select
              value={form.tipo_documento_default}
              onChange={(e) => set("tipo_documento_default", Number(e.target.value))}
            >
              {TIPOS_DOC_DTE.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          {campo("Número de resolución SII", "resolucion_numero", "80")}
          <label className="admin-campo">
            <span>Fecha de resolución SII</span>
            <input
              type="date"
              value={form.resolucion_fecha ?? ""}
              onChange={(e) => set("resolucion_fecha", e.target.value || null)}
            />
          </label>

          <div className="admin-form-botones">
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={probar} disabled={probando || !form.api_url}>
              {probando ? "Probando…" : "Probar conexión"}
            </button>
            {ok && <span className="admin-ok">Guardado.</span>}
          </div>

          {prueba && (
            <div className={prueba.ok ? "admin-ok" : "admin-error"}>{prueba.detalle}</div>
          )}
          <small className="admin-ayuda">
            "Probar conexión" solo verifica que el servidor del proveedor
            responda. No valida el token ni el resto de la configuración.
          </small>
        </form>
      </section>
    </div>
  );
}
