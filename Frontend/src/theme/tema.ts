/** Aplica el tema editable del cliente (acento + bordes) sobre los tokens CSS.
 *  Solo toca el color de acento y el radio de los bordes: las superficies, el
 *  texto y las tipografías quedan fijas para no romper el contraste. */

export type ModoTema = "claro" | "oscuro" | "sistema";
export type RadioTema = "recto" | "suave" | "redondeado";

export type TemaConfig = {
  acento: string | null;
  modo: ModoTema;
  radio: RadioTema;
};

export const TEMA_POR_DEFECTO: TemaConfig = { acento: null, modo: "sistema", radio: "suave" };

const RADIOS: Record<RadioTema, [string, string, string]> = {
  recto: ["3px", "4px", "5px"],
  suave: ["8px", "10px", "14px"],
  redondeado: ["12px", "16px", "22px"],
};

const VARS_ACENTO = ["--accent", "--accent-hover", "--accent-ink", "--accent-text", "--ring"];

function hexAHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return [hue * 360, s * 100, l * 100];
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h.toFixed(0)} ${Math.max(0, Math.min(100, s)).toFixed(0)}% ${Math.max(0, Math.min(100, l)).toFixed(0)}%)`;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function derivar(acento: string, oscuro: boolean) {
  const [h, s, l0] = hexAHsl(acento);
  // En oscuro el acento se aclara para no quedar apagado sobre el fondo negro.
  const l = oscuro ? clamp(l0, 50, 68) : l0;
  const acc = oscuro ? hsl(h, clamp(s, 0, 88), l) : acento;
  return {
    "--accent": acc,
    // hover: hacia más contraste con el fondo
    "--accent-hover": oscuro ? hsl(h, s, clamp(l + 12, 0, 92)) : hsl(h, s, clamp(l - 10, 8, 100)),
    // tinta sobre el acento: negra si el acento es claro, blanca si es oscuro
    "--accent-ink": l > 60 ? hsl(h, clamp(s, 0, 40), 12) : hsl(h, clamp(s, 0, 25), 96),
    // acento para texto/enlaces: legible sobre el fondo
    "--accent-text": oscuro ? hsl(h, clamp(s, 0, 80), clamp(l + 6, 58, 80)) : hsl(h, clamp(s + 6, 0, 90), clamp(l0, 30, 42)),
    "--ring": `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${clamp(l, 40, 68).toFixed(0)}% / 0.38)`,
  };
}

/** `oscuro` = si la pantalla se está mostrando en modo oscuro ahora mismo. */
export function aplicarTema(cfg: TemaConfig, oscuro: boolean) {
  const root = document.documentElement.style;

  if (cfg.acento) {
    const vars = derivar(cfg.acento, oscuro);
    for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
  } else {
    for (const v of VARS_ACENTO) root.removeProperty(v);
  }

  const [sm, md, lg] = RADIOS[cfg.radio] ?? RADIOS.suave;
  root.setProperty("--radius-sm", sm);
  root.setProperty("--radius", md);
  root.setProperty("--radius-lg", lg);
}
