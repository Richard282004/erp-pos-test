import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { obtenerAparienciaLogin } from "../api/empresa";
import {
  aplicarTema,
  TEMA_POR_DEFECTO,
  type ModoTema,
  type TemaConfig,
} from "./tema";

type Theme = "light" | "dark";

const KEY_THEME = "bb-theme"; // override por dispositivo (lo escribe el toggle)
const KEY_TEMA = "bb-tema"; // cache del tema del negocio (lo lee theme-init.js)

type Ctx = {
  theme: Theme;
  toggle: () => void;
  tema: TemaConfig;
  /** Aplica un tema en vivo (previsualización). No lo guarda en el servidor. */
  setTema: (t: TemaConfig) => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: "light",
  toggle: () => {},
  tema: TEMA_POR_DEFECTO,
  setTema: () => {},
});

function prefiereOscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Modo efectivo: override del dispositivo si existe; si no, el del negocio. */
function resolverModo(modoNegocio: ModoTema): Theme {
  try {
    const dev = localStorage.getItem(KEY_THEME);
    if (dev === "light" || dev === "dark") return dev;
  } catch {
    /* localStorage no disponible */
  }
  if (modoNegocio === "claro") return "light";
  if (modoNegocio === "oscuro") return "dark";
  return prefiereOscuro() ? "dark" : "light";
}

function temaCacheado(): TemaConfig {
  try {
    const raw = localStorage.getItem(KEY_TEMA);
    if (raw) return { ...TEMA_POR_DEFECTO, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return TEMA_POR_DEFECTO;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<TemaConfig>(temaCacheado);
  const [overrideDispositivo, setOverrideDispositivo] = useState<Theme | null>(() => {
    try {
      const dev = localStorage.getItem(KEY_THEME);
      return dev === "light" || dev === "dark" ? dev : null;
    } catch {
      return null;
    }
  });

  const theme: Theme = overrideDispositivo ?? resolverModo(tema.modo);

  // Trae el tema del negocio una vez y lo cachea.
  useEffect(() => {
    let vivo = true;
    obtenerAparienciaLogin()
      .then((a) => {
        if (!vivo) return;
        const nuevo: TemaConfig = { acento: a.acento, modo: a.modo, radio: a.radio };
        setTemaState(nuevo);
        try {
          localStorage.setItem(KEY_TEMA, JSON.stringify(nuevo));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* sin conexión: se queda con el cache */
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Aplica modo + tokens cada vez que cambia algo.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    aplicarTema(tema, theme === "dark");
  }, [theme, tema]);

  const toggle = useCallback(() => {
    setOverrideDispositivo((actual) => {
      const siguiente: Theme = (actual ?? theme) === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY_THEME, siguiente);
      } catch {
        /* ignore */
      }
      return siguiente;
    });
  }, [theme]);

  const setTema = useCallback((t: TemaConfig) => {
    setTemaState(t);
    try {
      localStorage.setItem(KEY_TEMA, JSON.stringify(t));
    } catch {
      /* ignore */
    }
  }, []);

  const valor = useMemo<Ctx>(() => ({ theme, toggle, tema, setTema }), [theme, toggle, tema, setTema]);

  return <ThemeCtx.Provider value={valor}>{children}</ThemeCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeCtx);
