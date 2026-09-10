import { useEffect, useState } from "react";
import {
  obtenerEmpresa,
  actualizarEmpresa,
  type EmpresaInput,
  type ModoTema,
  type RadioTema,
} from "../../api/empresa";
import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../theme/ThemeContext";
import { mensajeError } from "../../lib/errores";

const ACENTOS = [
  { hex: "#E7A324", nombre: "Ámbar" },
  { hex: "#E4572E", nombre: "Naranja" },
  { hex: "#C7352E", nombre: "Rojo" },
  { hex: "#2E7D5B", nombre: "Verde" },
  { hex: "#2F7DA8", nombre: "Azul" },
  { hex: "#5B57C7", nombre: "Violeta" },
  { hex: "#C7407D", nombre: "Frambuesa" },
];

const MODOS: { valor: ModoTema; nombre: string }[] = [
  { valor: "sistema", nombre: "Según el dispositivo" },
  { valor: "claro", nombre: "Siempre claro" },
  { valor: "oscuro", nombre: "Siempre oscuro" },
];

const RADIOS: { valor: RadioTema; nombre: string }[] = [
  { valor: "recto", nombre: "Rectos" },
  { valor: "suave", nombre: "Suaves" },
  { valor: "redondeado", nombre: "Redondeados" },
];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function AparienciaPage() {
  const { accessToken } = useAuth();
  const { setTema } = useTheme();

  const [empresa, setEmpresa] = useState<EmpresaInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let ignore = false;
    obtenerEmpresa(accessToken)
      .then((e) => {
        if (ignore) return;
        setEmpresa(e);
      })
      .catch((err) => {
        if (!ignore) setError(mensajeError(err, "Error cargando la apariencia"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  // Cambia un campo del tema y lo previsualiza en vivo.
  const cambiar = (parche: Partial<EmpresaInput>) => {
    setEmpresa((e) => {
      if (!e) return e;
      const nuevo = { ...e, ...parche };
      setTema({
        acento: nuevo.tema_acento && HEX.test(nuevo.tema_acento) ? nuevo.tema_acento : null,
        modo: nuevo.tema_modo,
        radio: nuevo.tema_radio,
      });
      setOk(false);
      return nuevo;
    });
  };

  const guardar = async () => {
    if (!empresa) return;
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      await actualizarEmpresa(
        { ...empresa, tema_acento: empresa.tema_acento || null },
        accessToken,
      );
      setOk(true);
    } catch (err) {
      setError(mensajeError(err, "Error guardando"));
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = () => {
    cambiar({ tema_acento: null, tema_modo: "sistema", tema_radio: "suave" });
  };

  if (loading) return <div className="admin-modulo">Cargando…</div>;
  if (!empresa) return <div className="admin-modulo"><div className="admin-error">{error}</div></div>;

  const acentoActual = empresa.tema_acento || "";

  return (
    <div className="admin-modulo">
      <h2>Apariencia</h2>
      <p className="admin-ayuda ap-intro">
        Los cambios se ven al instante. Recién quedan para todos cuando tocás Guardar.
      </p>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-form-section">
        <div className="admin-form ap-form">
          <h3>Color</h3>
          <div className="ap-swatches">
            {ACENTOS.map((a) => (
              <button
                key={a.hex}
                type="button"
                className={"ap-swatch" + (acentoActual.toLowerCase() === a.hex.toLowerCase() ? " activo" : "")}
                style={{ background: a.hex }}
                title={a.nombre}
                aria-label={a.nombre}
                onClick={() => cambiar({ tema_acento: a.hex })}
              />
            ))}
            <label className="ap-swatch ap-swatch-custom" title="Elegir otro color">
              <input
                type="color"
                value={acentoActual || "#E7A324"}
                onChange={(e) => cambiar({ tema_acento: e.target.value })}
              />
            </label>
          </div>
          <label className="admin-campo ap-hex">
            <span>Código del color</span>
            <input
              value={acentoActual}
              placeholder="#E7A324"
              onChange={(e) => cambiar({ tema_acento: e.target.value.trim() || null })}
            />
          </label>

          <h3>Modo claro / oscuro</h3>
          {MODOS.map((m) => (
            <label key={m.valor} className="admin-check-inline">
              <input
                type="radio"
                name="modo"
                checked={empresa.tema_modo === m.valor}
                onChange={() => cambiar({ tema_modo: m.valor })}
              />
              <span>{m.nombre}</span>
            </label>
          ))}
          <small className="admin-ayuda">
            Cada persona igual puede cambiarlo en su equipo con el interruptor de arriba a la derecha.
          </small>

          <h3>Bordes</h3>
          <div className="ap-radios">
            {RADIOS.map((r) => (
              <button
                key={r.valor}
                type="button"
                className={"ap-radio-op ap-radio-" + r.valor + (empresa.tema_radio === r.valor ? " activo" : "")}
                onClick={() => cambiar({ tema_radio: r.valor })}
              >
                {r.nombre}
              </button>
            ))}
          </div>

          <div className="admin-form-botones">
            <button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="ap-restaurar" onClick={restaurar}>
              Restaurar el diseño original
            </button>
            {ok && <span className="admin-ok">Guardado.</span>}
          </div>
        </div>
      </section>

      <p className="admin-ayuda ap-nota">
        Los fondos, el texto y las tipografías no se editan a propósito: así el
        contraste y la legibilidad se mantienen en todas las pantallas.
      </p>
    </div>
  );
}
