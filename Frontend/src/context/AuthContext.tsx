import { useEffect, useState, type ReactNode } from "react";
import { setUnauthorizedHandler } from "../api/client";
import { me, type CurrentUser } from "../api/auth";
import { AuthContext, type AuthContextValue } from "./authContextObject";

const STORAGE_KEY = "bb-token";

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
    if (!accessToken || currentUser) {
      setRestaurando(false);
      return;
    }
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
