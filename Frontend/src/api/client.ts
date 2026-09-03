const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

// Ojo: si VITE_API_URL queda definida pero vacía (pasa fácil en Vercel), `??` no
// cae al default y las llamadas irían al propio dominio del frontend. Por eso se
// descarta el string vacío a mano. También se saca la barra final para no armar
// URLs con "//".
const RAW_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE_URL = (RAW_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function errorMessage(res: Response): Promise<string> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return "";
  }
  try {
    const data = JSON.parse(text);
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // no era JSON, se usa el texto crudo
  }
  return text;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError("Sesión expirada, volvé a iniciar sesión", 401);
  }

  if (!res.ok) {
    const text = await errorMessage(res);
    throw new ApiError(text || `Error HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
