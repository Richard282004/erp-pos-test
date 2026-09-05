import { createPortal } from "react-dom";
import type { Aviso } from "../../hooks/useAvisos";

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
