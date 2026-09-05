import { useCallback, useEffect, useState } from "react";
import { turnoActual, type ResumenTurno } from "../api/caja";
import { useAuth } from "../context/useAuth";

export function useCajaTurno() {
  const { accessToken } = useAuth();
  const [resumen, setResumen] = useState<ResumenTurno | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!accessToken) {
      setResumen(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    turnoActual(accessToken)
      .then(setResumen)
      .catch(() => setResumen(null))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    let ignore = false;
    const traer = accessToken ? turnoActual(accessToken).catch(() => null) : Promise.resolve(null);
    traer
      .then((r) => {
        if (!ignore) setResumen(r);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [accessToken]);

  return { resumen, turno: resumen?.turno ?? null, loading, refetch };
}
