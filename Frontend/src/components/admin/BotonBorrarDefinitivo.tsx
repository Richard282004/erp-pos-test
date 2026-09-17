import { useState } from "react";
import { useConfirm } from "../../context/ConfirmContext";

/**
 * "Eliminar definitivamente" para una fila ya inactiva. Pide una confirmación
 * fuerte (hay que escribir BORRAR) porque no se puede deshacer. Si el backend
 * responde 409 —algo referencia la fila— muestra el motivo tal cual.
 */
export function BotonBorrarDefinitivo({
  nombre,
  onBorrar,
  onHecho,
}: {
  nombre: string;
  onBorrar: () => Promise<unknown>;
  onHecho: () => void;
}) {
  const [borrando, setBorrando] = useState(false);
  const { confirmar, avisar } = useConfirm();

  return (
    <button
      className="admin-borrar-definitivo"
      disabled={borrando}
      onClick={async () => {
        const ok = await confirmar({
          titulo: "Borrar definitivamente",
          mensaje: `Esto borra "${nombre}" para siempre y no se puede deshacer.`,
          variante: "peligro",
          textoConfirmar: "Borrar para siempre",
          escribir: "BORRAR",
        });
        if (!ok) return;
        setBorrando(true);
        try {
          await onBorrar();
          onHecho();
        } catch (err) {
          avisar(
            err instanceof Error && err.message
              ? err.message
              : "No se pudo borrar"
          );
        } finally {
          setBorrando(false);
        }
      }}
    >
      {borrando ? "Borrando…" : "Eliminar definitivamente"}
    </button>
  );
}
