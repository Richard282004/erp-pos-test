import { useCallback, useRef, useState } from "react";

export type TipoAviso = "ok" | "error" | "info";

export type Aviso = {
  id: number;
  tipo: TipoAviso;
  texto: string;
};

const DURACION_MS = 2600;

/**
 * Avisos breves arriba de todo. Verde para lo que salió bien, rojo para lo
 * cancelado o fallido. El render lo hace <Avisos>.
 */
export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback(
    (tipo: TipoAviso, texto: string) => {
      const id = siguienteId.current++;
      setAvisos((lista) => [...lista, { id, tipo, texto }]);
      window.setTimeout(() => cerrar(id), DURACION_MS);
    },
    [cerrar]
  );

  return { avisos, avisar, cerrar };
}
