import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login as apiLogin, me } from "../api/auth";
import { obtenerAparienciaLogin, type AparienciaLogin } from "../api/empresa";
import { useAuth } from "../context/useAuth";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { CampoPassword } from "../components/common/CampoPassword";
import { mensajeError } from "../lib/errores";
import { APP_VERSION_TEXTO } from "../lib/version";

export function LoginPage() {
  const { accessToken, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  // El backend del plan gratuito se duerme tras 15 min sin uso y tarda en
  // despertar. Si la respuesta demora, se avisa en vez de dejar la pantalla muda.
  const [demorando, setDemorando] = useState(false);
  const temporizador = useRef<number | null>(null);

  // El cierre por inactividad deja una marca antes de borrar la sesión;
  // se muestra una vez y se limpia, para no repetirla en el próximo login.
  const [motivoCierre] = useState(() => {
    try {
      const m = sessionStorage.getItem("bb-logout-motivo");
      if (m) sessionStorage.removeItem("bb-logout-motivo");
      return m;
    } catch {
      return null;
    }
  });

  const [apariencia, setApariencia] = useState<AparienciaLogin | null>(null);
  useEffect(() => {
    let ignore = false;
    obtenerAparienciaLogin()
      .then((a) => {
        if (!ignore) setApariencia(a);
      })
      .catch(() => {
        /* si no carga, se usa el texto por defecto */
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  // Reloj en vivo: lo primero que ve el cajero al llegar a su turno.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  if (accessToken) return <Navigate to={destino} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEntrando(true);
    setDemorando(false);
    temporizador.current = window.setTimeout(() => setDemorando(true), 3000);
    try {
      const { access_token } = await apiLogin(username, password);
      const usuario = await me(access_token);
      login(access_token, usuario);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(mensajeError(err, "No se pudo iniciar sesión"));
    } finally {
      if (temporizador.current) window.clearTimeout(temporizador.current);
      setEntrando(false);
      setDemorando(false);
    }
  };

  const titulo = apariencia?.titulo || "POS Mini ERP";
  const subtitulo = apariencia?.subtitulo || "Ingresá para abrir tu turno";
  const mostrarLogo = apariencia?.mostrar_logo !== false;
  // El color del tema lo aplica ThemeProvider sobre :root para toda la app.

  const fmtFecha = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  });
  const fmtHora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  });

  return (
    <div className="login-page">
      <ThemeToggle className="theme-toggle--floating" />
      <div className="login-split">
        <aside className="login-aside">
          <div className="login-aside-marca">
            {mostrarLogo && apariencia?.logo_url ? (
              <img className="login-logo-img" src={apariencia.logo_url} alt={titulo} />
            ) : (
              <span className="login-marca-txt">{titulo}</span>
            )}
          </div>

          <div className="login-turno">
            <span className="login-turno-fecha">{fmtFecha.format(ahora)}</span>
            <time className="login-turno-hora">{fmtHora.format(ahora)}</time>
            <span className="login-turno-linea">{subtitulo}</span>
          </div>

          <span className="login-aside-version">{APP_VERSION_TEXTO}</span>
        </aside>

        <main className="login-main">
          <form className="login-form" onSubmit={submit}>
            <h2 className="login-form-title">Entrar a la caja</h2>

            <label className="login-field">
              <span>Usuario</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
              />
            </label>

            <CampoPassword
              label="Contraseña"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />

            {!error && motivoCierre === "inactividad" && (
              <div className="login-info">Se cerró la sesión por inactividad.</div>
            )}
            {error && <div className="login-error">{error}</div>}

            <button className="login-submit" type="submit" disabled={entrando}>
              {entrando ? "Entrando…" : "Entrar"}
            </button>

            {demorando && (
              <div className="login-espera" role="status">
                <span className="login-espera-punto" aria-hidden="true" />
                <div>
                  <strong>Despertando el servidor…</strong>
                  <p>
                    La primera entrada del día puede tardar hasta un minuto. No
                    cierres la página.
                  </p>
                </div>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
