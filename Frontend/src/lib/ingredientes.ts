/** minúsculas y sin tildes, para comparar sin que "jamón" ≠ "jamon" arruine el match. */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function palabrasDeTexto(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Matching simple por palabra (no IA): busca el nombre del insumo tal cual
 * dentro de la descripción, o alguna de sus palabras (de 4+ letras, para
 * no confundir "de"/"con" con un insumo). Con margen de error a propósito —
 * el usuario ajusta cantidad y saca lo que no corresponda.
 */
export function sugerirInsumosDesdeDescripcion<T extends { nombre: string }>(
  descripcion: string,
  insumos: T[]
): T[] {
  const texto = normalizar(descripcion);
  if (!texto.trim()) return [];
  const palabrasTexto = new Set(palabrasDeTexto(texto));

  return insumos.filter((i) => {
    const nombreNorm = normalizar(i.nombre);
    if (texto.includes(nombreNorm)) return true;
    return palabrasDeTexto(nombreNorm)
      .filter((p) => p.length >= 4)
      .some((p) => palabrasTexto.has(p));
  });
}

/** Palabras genéricas que aparecen seguido en descripciones y no son un insumo en sí. */
const PALABRAS_GENERICAS = new Set([
  "para",
  "con",
  "sin",
  "por",
  "que",
  "los",
  "las",
  "del",
  "una",
  "uno",
  "unos",
  "unas",
  "doble",
  "dobles",
  "triple",
  "especial",
  "especiales",
  "artesanal",
  "artesanales",
  "grillado",
  "grillada",
  "grillados",
  "grilladas",
  "caramelizada",
  "caramelizado",
  "caramelizadas",
  "caramelizados",
  "hidroponica",
  "hidroponico",
  "frita",
  "fritas",
  "frito",
  "fritos",
  "gourmet",
  "clasica",
  "clasico",
  "mini",
  "grande",
  "chica",
  "chico",
]);

/**
 * El inverso de arriba: junta las palabras de las descripciones de los
 * productos que todavía no corresponden a ningún insumo existente — para
 * sugerir qué insumo nuevo crear. También por palabra, con margen de error.
 */
export function sugerirNombresInsumo(
  descripciones: (string | null | undefined)[],
  insumosExistentes: { nombre: string }[],
  limite = 15
): string[] {
  const cubiertas = new Set<string>();
  for (const ins of insumosExistentes) {
    for (const p of palabrasDeTexto(ins.nombre)) {
      if (p.length >= 4) cubiertas.add(p);
    }
  }

  const conteo = new Map<string, number>();
  for (const desc of descripciones) {
    if (!desc) continue;
    for (const p of palabrasDeTexto(desc)) {
      if (p.length < 4 || PALABRAS_GENERICAS.has(p) || cubiertas.has(p)) continue;
      conteo.set(p, (conteo.get(p) ?? 0) + 1);
    }
  }

  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite)
    .map(([p]) => p[0].toUpperCase() + p.slice(1));
}
