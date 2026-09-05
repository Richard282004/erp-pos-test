import { useEffect, useState, type ReactNode } from "react";
import { setUnauthorizedHandler } from "../api/client";
import { me, type CurrentUser } from "../api/auth";
import { AuthContext, type AuthContextValue } from "./authContextObject";

const STORAGE_KEY = "bb-token";
const MOTIVO_KEY = "bb-logout-motivo";

// La tablet del mostrador queda con la sesión abierta si nadie la toca.
// A los 20 min sin actividad se cierra sola.
const INACTIVIDAD_MS = 20 * 60 * 1000;
const EVENTOS_ACTIVIDAD = ["mousedown", "keydown", "touchstart", "wheel"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState<boolean>(!!accessToken);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setCurrentUser(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setLoginError("Sesión expirada, volvé a iniciar sesión");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Al cargar con un token guardado: validarlo y traer el usuario.
  useEffect(() => {
    // `restaurando` ya arranca en `!!accessToken`, así que sin token no hay
    // nada que restaurar ni estado que tocar acá.
    if (!accessToken || currentUser) return;
    let vivo = true;
    me(accessToken)
      .then((u) => {
        if (vivo) setCurrentUser(u);
      })
      .catch(() => {
        if (!vivo) return;
        setAccessToken(null);
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (vivo) setRestaurando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (token: string, usuario: CurrentUser) => {
    setAccessToken(token);
    setCurrentUser(usuario);
    setLoginError(null);
    setRestaurando(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    setAccessToken(null);
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  // Cierre por inactividad: solo corre con sesión activa. Cualquier toque,
  // tecla o scroll reinicia el reloj.
  useEffect(() => {
    if (!accessToken) return;

    let temporizador: number;
    const reiniciar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        try {
          sessionStorage.setItem(MOTIVO_KEY, "inactividad");
        } catch {
          /* ignore */
        }
        logout();
      }, INACTIVIDAD_MS);
    };

    EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, reiniciar));
    reiniciar();

    return () => {
      window.clearTimeout(temporizador);
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, reiniciar));
    };
  }, [accessToken]);

  const value: AuthContextValue = {
    accessToken,
    currentUser,
    loginError,
    restaurando,
    login,
    logout,
    clearLoginError: () => setLoginError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
