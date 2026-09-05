import { ApiError } from "../api/client";

/**
 * Texto de error legible para el usuario. Prioriza el mensaje que mandó el
 * servidor; si no hay, usa `fallback`. Nunca devuelve "[object Object]" ni
 * un stack trace.
 */
export function mensajeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return "Sin conexión a internet. Revisá el WiFi e intentá de nuevo.";
    }
    if (err.status === 401) {
      return "La sesión venció. Volvé a iniciar sesión.";
    }
    if (err.status === 403) {
      return err.message || "No tenés permiso para hacer esto.";
    }
    if (err.status >= 500) {
      return "El servidor tuvo un problema. Probá de nuevo en un momento.";
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
