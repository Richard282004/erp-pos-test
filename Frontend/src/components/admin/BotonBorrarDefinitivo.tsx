import { useState } from "react";

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

  return (
    <button
      className="admin-borrar-definitivo"
      disabled={borrando}
      onClick={async () => {
        const r = window.prompt(
          `Esto borra "${nombre}" para siempre y no se puede deshacer.\n` +
            `Escribí BORRAR para confirmar:`
        );
        if (r !== "BORRAR") return;
        setBorrando(true);
        try {
          await onBorrar();
          onHecho();
        } catch (err) {
          window.alert(
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
