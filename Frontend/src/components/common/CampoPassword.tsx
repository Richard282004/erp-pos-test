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
  const id = useId();

  const mostrar = () => setVisible(true);
  const ocultar = () => setVisible(false);

  return (
    <label className={className + " campo-password"} htmlFor={id}>
      <span>{label}</span>

      <div className="campo-password-caja">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          {visible ? "🙈" : "👁"}
        </button>
      </div>

      {error && <small className="campo-password-error">{error}</small>}
    </label>
  );
}
