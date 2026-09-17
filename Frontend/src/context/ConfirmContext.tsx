import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  titulo?: string;
  mensaje: string;
  /** "peligro" pinta el botón de confirmar en rojo (borrar, anular, etc). */
  variante?: "normal" | "peligro";
  textoConfirmar?: string;
  /** null = sin botón de cancelar (para avisos tipo "OK"). */
  textoCancelar?: string | null;
  /** Si se pasa, hay que escribir exactamente este texto para poder confirmar. */
  escribir?: string;
};

type EstadoDialogo = ConfirmOptions & { resolver: (v: boolean) => void };

type ConfirmContextValue = {
  confirmar: (opts: ConfirmOptions | string) => Promise<boolean>;
  avisar: (mensaje: string, titulo?: string) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialogo, setDialogo] = useState<EstadoDialogo | null>(null);
  const [textoEscrito, setTextoEscrito] = useState("");
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const opciones: ConfirmOptions = typeof opts === "string" ? { mensaje: opts } : opts;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setTextoEscrito("");
      setDialogo({ ...opciones, resolver: resolve });
    });
  }, []);

  const avisar = useCallback(
    (mensaje: string, titulo?: string): Promise<void> =>
      confirmar({ mensaje, titulo, textoCancelar: null, textoConfirmar: "OK" }).then(() => undefined),
    [confirmar]
  );

  const cerrar = (v: boolean) => {
    resolverRef.current?.(v);
    resolverRef.current = null;
    setDialogo(null);
  };

  const bloqueadoPorTexto = !!dialogo?.escribir && textoEscrito !== dialogo.escribir;

  return (
    <ConfirmContext.Provider value={{ confirmar, avisar }}>
      {children}
      {dialogo &&
        createPortal(
          <div className="confirm-backdrop" onClick={() => cerrar(false)}>
            <div
              className="confirm-caja"
              role="alertdialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {dialogo.titulo && <h3>{dialogo.titulo}</h3>}
              <p className="confirm-mensaje">{dialogo.mensaje}</p>

              {dialogo.escribir && (
                <input
                  autoFocus
                  className="confirm-input"
                  value={textoEscrito}
                  onChange={(e) => setTextoEscrito(e.target.value)}
                  placeholder={`Escribí ${dialogo.escribir}`}
                />
              )}

              <div className="confirm-botones">
                {dialogo.textoCancelar !== null && (
                  <button className="confirm-cancelar" onClick={() => cerrar(false)}>
                    {dialogo.textoCancelar ?? "Cancelar"}
                  </button>
                )}
                <button
                  className={"confirm-ok" + (dialogo.variante === "peligro" ? " peligro" : "")}
                  autoFocus={!dialogo.escribir}
                  disabled={bloqueadoPorTexto}
                  onClick={() => cerrar(true)}
                >
                  {dialogo.textoConfirmar ?? "Confirmar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}
