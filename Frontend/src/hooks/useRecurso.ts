import { useCallback, useEffect, useState } from "react";
import { mensajeError } from "../lib/errores";

type Estado<T> = {
  datos: T;
  loading: boolean;
  error: string | null;
  /** Recarga el recurso. Usar tras crear / editar / borrar. */
  refetch: () => Promise<void>;
  /** Ajuste local del cache (ej. quitar una fila ya borrada sin ir al server). */
  setDatos: React.Dispatch<React.SetStateAction<T>>;
};

/**
 * Carga un recurso al montar y cada vez que cambia `cargador`. Pasá `cargador`
 * memoizado con useCallback: sus dependencias (token, filtros) definen cuándo
 * se recarga solo.
 *
 * El fetch del montaje trae un guard `ignore` para que una respuesta que llega
 * tarde no pise datos nuevos ni escriba en un componente ya desmontado.
 */
export function useRecurso<T>(cargador: () => Promise<T>, textoError: string, inicial: T): Estado<T> {
  const [datos, setDatos] = useState<T>(inicial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDatos(await cargador());
    } catch (err) {
      setError(mensajeError(err, textoError));
    } finally {
      setLoading(false);
    }
  }, [cargador, textoError]);

  useEffect(() => {
    let ignore = false;
    cargador()
      .then((d) => {
        if (!ignore) {
          setDatos(d);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) setError(mensajeError(err, textoError));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [cargador, textoError]);

  return { datos, loading, error, refetch, setDatos };
}
