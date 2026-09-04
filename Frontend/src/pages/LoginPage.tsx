import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { login as apiLogin, me } from "../api/auth";
import { useAuth } from "../context/useAuth";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { CampoPassword } from "../components/common/CampoPassword";

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

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

  useEffect(() => {
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
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

  return (
    <div className="login-page">
      <ThemeToggle className="theme-toggle--floating" />
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="login-logo">🍔</span>
          <h1>Byeburger POS</h1>
          <p>Ingresá para operar la caja</p>
        </div>

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
    </div>
  );
}
