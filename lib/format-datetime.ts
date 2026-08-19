/**
 * Formato de fecha legible y contextual del módulo de documentos: “Lunes 15 de marzo, 11:55 PM”.
 *
 * Se compone a mano en vez de con `Intl.DateTimeFormat('es-MX')` porque el resultado de Intl varía
 * entre runtimes (Node del servidor de build, navegador, jsdom en los tests) y para es-MX devuelve
 * “lunes, 15 de marzo, 11:55 p.m.”: día de la semana en minúscula y meridiano con puntos. La tabla
 * de documentos necesita exactamente el formato de arriba en las tres secciones, así que aquí no
 * se delega esa decisión al ICU del entorno.
 */

const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Marcador que se muestra cuando no hay fecha o la que llegó no es parseable. */
export const EMPTY_DATE_PLACEHOLDER = '—';

/**
 * @param isoDate fecha ISO tal como la devuelve el backend (`createdAt`).
 * @returns p. ej. `"Lunes 15 de marzo, 11:55 PM"`, en la zona horaria del navegador.
 */
export function formatLongDateTime(
  isoDate: string | Date | null | undefined,
): string {
  if (!isoDate) return EMPTY_DATE_PLACEHOLDER;

  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return EMPTY_DATE_PLACEHOLDER;

  const weekday = WEEKDAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
  // 0h → 12 AM y 12h → 12 PM: el resto del rango de 12 horas sale del módulo directo.
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${weekday} ${date.getDate()} de ${month}, ${hours}:${minutes} ${meridiem}`;
}
