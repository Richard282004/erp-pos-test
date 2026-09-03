import { useRef, useState } from "react";
import { comprimirImagen, subirImagenProducto } from "../../api/imagenes";
import { useAuth } from "../../context/useAuth";

/**
 * Foto del producto: se elige del dispositivo (en el celular ofrece cámara o
 * galería), se reduce y se sube. El campo de URL queda disponible para pegar
 * una dirección externa.
 */
export function ImagenProductoInput({
  valor,
  onChange,
}: {
  valor: string | null;
  onChange: (url: string | null) => void;
}) {
  const { accessToken } = useAuth();
  const input = useRef<HTMLInputElement>(null);

  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      onChange(await subirImagenProducto(comprimida, accessToken, archivo.name));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = ""; // permite reelegir el mismo archivo
    }
  };

  return (
    <div className="foto-producto">
      <span className="foto-producto-label">Foto</span>

      <div className="foto-producto-cuerpo">
        {valor ? (
          <img className="foto-producto-preview" src={valor} alt="Vista previa del producto" />
        ) : (
          <div className="foto-producto-vacia">Sin foto</div>
        )}

        <div className="foto-producto-acciones">
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => elegir(e.target.files?.[0])}
          />
          <button type="button" onClick={() => input.current?.click()} disabled={subiendo}>
            {subiendo ? "Subiendo…" : valor ? "Cambiar foto" : "Subir foto"}
          </button>
          {valor && (
            <button type="button" onClick={() => onChange(null)} disabled={subiendo}>
              Quitar
            </button>
          )}
          <button type="button" className="foto-producto-link" onClick={() => setManual((v) => !v)}>
            {manual ? "Ocultar URL" : "Pegar una URL"}
          </button>
        </div>
      </div>

      {manual && (
        <input
          className="foto-producto-url"
          placeholder="https://…"
          value={valor ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}

      {error && <div className="foto-producto-error">{error}</div>}
    </div>
  );
}
