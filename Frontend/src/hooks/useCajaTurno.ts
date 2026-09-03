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
    refetch();
  }, [refetch]);

  return { resumen, turno: resumen?.turno ?? null, loading, refetch };
}
