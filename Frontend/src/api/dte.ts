import { apiFetch } from "./client";

export const PROVEEDORES_DTE = [
  { valor: "OPENFACTURA", nombre: "OpenFactura / Haulmer" },
  { valor: "LIBREDTE", nombre: "LibreDTE" },
  { valor: "BSALE", nombre: "Bsale" },
] as const;

export const TIPOS_DOC_DTE = [
  { valor: 39, nombre: "Boleta electrónica (39)" },
  { valor: 33, nombre: "Factura electrónica (33)" },
] as const;

export type ConfigDTE = {
  activado: boolean;
  proveedor: string | null;
  ambiente: "certificacion" | "produccion";
  api_url: string | null;
  /** Enmascarado (••••1234) o null. El valor real nunca vuelve del servidor. */
  api_token: string | null;
  api_token_configurado: boolean;
  rut_emisor: string | null;
  razon_social: string | null;
  giro: string | null;
  codigo_actividad: string | null;
  direccion_casa_matriz: string | null;
  comuna_casa_matriz: string | null;
  tipo_documento_default: number;
  resolucion_numero: string | null;
  resolucion_fecha: string | null;
  fecha_actualizacion: string | null;
};

export type ConfigDTEInput = {
  activado: boolean;
  proveedor: string | null;
  ambiente: "certificacion" | "produccion";
  api_url: string | null;
  /** Solo se manda cuando el usuario escribe uno nuevo; vacío = no tocar. */
  api_token: string | null;
  rut_emisor: string | null;
  razon_social: string | null;
  giro: string | null;
  codigo_actividad: string | null;
  direccion_casa_matriz: string | null;
  comuna_casa_matriz: string | null;
  tipo_documento_default: number;
  resolucion_numero: string | null;
  resolucion_fecha: string | null;
};

export const obtenerConfigDte = (token: string | null) =>
  apiFetch<ConfigDTE>("/dte/config", { token });

export const guardarConfigDte = (input: ConfigDTEInput, token: string | null) =>
  apiFetch<ConfigDTE>("/dte/config", { method: "PUT", body: input, token });

export const probarConfigDte = (token: string | null) =>
  apiFetch<{ ok: boolean; detalle: string }>("/dte/config/probar", {
    method: "POST",
    token,
  });
