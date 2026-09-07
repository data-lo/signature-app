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

/**
 * Marca de tiempo Unix en MILISEGUNDOS, sólo dígitos (`1788791722000`).
 *
 * Es el formato con el que las hojas y constancias de firma muestran la fecha de firma. **No es
 * una preferencia estética: es lo que permite que la pantalla y el PDF digan lo mismo.** Una
 * fecha legible se rinde en la zona horaria de quien la mira, así que la misma firma se leía
 * "15 de enero, 4:30 AM" en la vista pública y con otra hora en la hoja anexada al documento
 * —que se generó en la zona del servidor—. El número es el instante, sin ninguna zona encima.
 *
 * Espejo de `formatSheetTimestamp` en signature-server, y con la misma unidad a propósito: los
 * dos parten del mismo `signedAt`, así que imprimen exactamente el mismo número sin que nadie
 * tenga que convertir.
 *
 * Devuelve `null` —y no el guion de `EMPTY_DATE_PLACEHOLDER`— cuando la fecha falta o no es
 * parseable, porque quien lo consume oculta el renglón entero en ese caso: en una constancia, un
 * renglón "Fecha de firma: —" afirma que se conoce el dato y está vacío, cuando lo cierto es que
 * no hay nada que acreditar.
 *
 * @param isoDate fecha ISO tal como la devuelve el backend (`signedAt`).
 */
export function formatEpochMillis(
  isoDate: string | Date | null | undefined,
): string | null {
  if (!isoDate) return null;

  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  return String(date.getTime());
}

/**
 * Formato corto `DD/MM/YYYY` con el que las tablas de documentos muestran las fechas de creación
 * y de firma: en un listado se comparan fechas de un vistazo, y para eso el formato numérico
 * alineado pesa más que la frase legible de `formatLongDateTime` (que sigue siendo la de las
 * pantallas de detalle y evidencia, donde cada fecha se lee sola).
 *
 * Se compone a mano por la misma razón que el otro: el resultado de `Intl` varía entre runtimes.
 *
 * @param isoDate fecha ISO tal como la devuelve el backend (`createdAt`, `signedAt`).
 * @param fallback texto para cuando no hay fecha o la que llegó no es parseable.
 * @returns p. ej. `"10/05/2026"`, en la zona horaria del navegador.
 */
export function formatShortDate(
  isoDate: string | Date | null | undefined,
  fallback: string = EMPTY_DATE_PLACEHOLDER,
): string {
  if (!isoDate) return fallback;

  const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
  if (Number.isNaN(date.getTime())) return fallback;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}/${date.getFullYear()}`;
}
