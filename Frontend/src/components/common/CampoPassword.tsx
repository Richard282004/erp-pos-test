import { useId, useState } from "react";

/**
 * Campo de contraseña con ojo para verla.
 *
 * En escritorio se ve mientras se mantiene apretado el ojo y se oculta al
 * soltar, así no queda a la vista de nadie si el cajero se da vuelta. En
 * pantalla táctil no hay "mantener apretado" cómodo, así que ahí alterna con
 * cada toque.
 */
export function CampoPassword({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder,
  required,
  autoFocus,
  className = "login-field",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [mayusActiva, setMayusActiva] = useState(false);
  const id = useId();

  const mostrar = () => setVisible(true);
  const ocultar = () => setVisible(false);

  // Bisagra en cada tecla: si Bloq Mayús está activo el password sale mal
  // sin que se note, porque el campo lo oculta con puntos.
  const revisarMayus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setMayusActiva(e.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <label className={className + " campo-password"} htmlFor={id}>
      <span>{label}</span>

      <div className="campo-password-caja">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={revisarMayus}
          onKeyUp={revisarMayus}
          onBlur={() => setMayusActiva(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
        />

        <button
          type="button"
          className="campo-password-ojo"
          aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
          aria-pressed={visible}
          // escritorio: visible mientras se mantiene apretado
          onMouseDown={mostrar}
          onMouseUp={ocultar}
          onMouseLeave={ocultar}
          // teclado: mientras se mantiene Enter o Espacio
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              mostrar();
            }
          }}
          onKeyUp={ocultar}
          onBlur={ocultar}
          // táctil: alterna, porque mantener apretado abre el menú del sistema
          onTouchStart={(e) => {
            e.preventDefault();
            setVisible((v) => !v);
          }}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
              <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5M6.3 6.9C3.9 8.4 3 10.4 3 12c0 2.5 4 7 9 7 1.5 0 2.9-.4 4.1-1" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          )}
        </button>
      </div>

      {mayusActiva && (
        <small className="campo-password-mayus">⇪ Bloq Mayús activado</small>
      )}
      {error && <small className="campo-password-error">{error}</small>}
    </label>
  );
}
