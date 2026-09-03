import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TipoAviso = "ok" | "error" | "info";

export type Aviso = {
  id: number;
  tipo: TipoAviso;
  texto: string;
};

const DURACION_MS = 2600;

/**
 * Avisos breves arriba de todo. Verde para lo que salió bien, rojo para lo
 * cancelado o fallido.
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

export function Avisos({
  avisos,
  onCerrar,
}: {
  avisos: Aviso[];
  onCerrar: (id: number) => void;
}) {
  if (avisos.length === 0) return null;

  return createPortal(
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <button
          key={a.id}
          className={"aviso aviso-" + a.tipo}
          onClick={() => onCerrar(a.id)}
        >
          <span className="aviso-icono" aria-hidden="true">
            {a.tipo === "ok" ? "✓" : a.tipo === "error" ? "✕" : "•"}
          </span>
          {a.texto}
        </button>
      ))}
    </div>,
    document.body
  );
}
