// Zona horaria del negocio. El servidor mide los días acá, así que el
// frontend tiene que armar las fechas de los filtros con la misma zona y no
// con la del dispositivo (una tablet mal configurada mandaría el día que no es).
const TZ_NEGOCIO = "America/Santiago";

const _fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_NEGOCIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha en formato YYYY-MM-DD en la hora del negocio. Sin argumento: hoy. */
export function fechaNegocioISO(d: Date = new Date()): string {
  return _fmt.format(d);
}

/** Hace días atrás desde hoy (hora del negocio). */
export function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return fechaNegocioISO(d);
}

/** Primer día del mes actual (hora del negocio). */
export function primerDiaDelMesISO(): string {
  const hoy = fechaNegocioISO(); // "YYYY-MM-DD"
  return hoy.slice(0, 8) + "01";
}
