import { useState } from "react";
import { createPortal } from "react-dom";
import { autorizar } from "../../api/auth";
import { CampoPassword } from "../common/CampoPassword";

/**
 * Un cajero superó el tope de descuento. En vez de que tenga que cerrar
 * sesión y que entre un supervisor, este pide su usuario y clave acá mismo
 * y devuelve un token de un solo propósito que habilita esta venta.
 */
export function AutorizarDescuento({
  porcentaje,
  accessToken,
  onAutorizado,
  onCancelar,
}: {
  porcentaje: number;
  accessToken: string | null;
  onAutorizado: (token: string, autorizadoPor: string) => void;
  onCancelar: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { token, autorizado_por } = await autorizar(
        username,
        password,
        porcentaje,
        accessToken,
      );
      onAutorizado(token, autorizado_por);
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : "No se pudo autorizar"
      );
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="admin-modal" onClick={onCancelar}>
      <form
        className="admin-modal-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>Autorización requerida</h3>
        <p className="admin-nota-modal">
          Este descuento es de <strong>{porcentaje.toFixed(1)}%</strong>, por
          arriba de lo que puede dar un cajero. Un supervisor o admin lo
          autoriza con su usuario acá, sin cerrar tu sesión.
        </p>

        <label>
          Usuario
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="off"
            required
          />
        </label>

        <CampoPassword
          className="admin-campo"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="off"
          required
        />

        {error && <div className="error-productos">{error}</div>}

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={enviando}>
            {enviando ? "Verificando…" : "Autorizar"}
          </button>
          <button type="button" onClick={onCancelar} style={{ marginLeft: 8 }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
