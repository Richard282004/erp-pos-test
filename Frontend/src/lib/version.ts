/** Versión visible en la interfaz. Subir a mano al liberar cambios grandes. */
export const APP_VERSION = "1.0";

/** Canal / estado. Vacío cuando sea una versión estable de verdad. */
export const APP_CANAL = "tester";

/** Texto listo para mostrar, p. ej. "v1.0 · tester". */
export const APP_VERSION_TEXTO = APP_CANAL
  ? `v${APP_VERSION} · ${APP_CANAL}`
  : `v${APP_VERSION}`;
