import { API_BASE_URL, ApiError } from "./client";

export type EstadoImagenes = { disponible: boolean; max_bytes: number };

export async function estadoImagenes(token: string | null): Promise<EstadoImagenes> {
  const res = await fetch(`${API_BASE_URL}/imagenes/estado`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError("No se pudo consultar el estado de imágenes", res.status);
  return res.json();
}

/** Sube el archivo a la API (que lo guarda en Supabase) y devuelve la URL pública. */
export async function subirImagenProducto(
  archivo: Blob,
  token: string | null,
  nombre = "foto.jpg"
): Promise<string> {
  const datos = new FormData();
  datos.append("archivo", archivo, nombre);

  // Sin Content-Type a mano: el navegador arma el boundary del multipart.
  const res = await fetch(`${API_BASE_URL}/imagenes/productos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: datos,
  });

  if (!res.ok) {
    let detalle = "";
    try {
      const cuerpo = await res.json();
      if (typeof cuerpo?.detail === "string") detalle = cuerpo.detail;
    } catch {
      /* respuesta sin JSON */
    }
    throw new ApiError(detalle || `Error subiendo la imagen (${res.status})`, res.status);
  }

  const { imagen_url } = (await res.json()) as { imagen_url: string };
  return imagen_url;
}

const LADO_MAXIMO = 1000;
const CALIDAD = 0.82;

/**
 * Reduce la foto antes de subirla. Una foto de celular son 4-6 MB y para una
 * tarjeta de producto sobra con 1000 px: sube mucho más rápido con datos móviles
 * y ocupa menos del bucket.
 */
export async function comprimirImagen(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo).catch(() => null);
  if (!bitmap) return archivo; // formato que el navegador no decodifica: se manda tal cual

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return archivo;
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    lienzo.toBlob(resolve, "image/jpeg", CALIDAD)
  );
  return blob ?? archivo;
}
