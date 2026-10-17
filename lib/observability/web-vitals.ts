import type { Event } from '@sentry/nextjs';
import { normalizeRoute } from './normalize-route';

/**
 * Métricas que se reportan. FID queda fuera aunque Next todavía lo emita: INP lo sustituyó como
 * Core Web Vital en 2024.
 */
export const REPORTED_WEB_VITALS = [
  'LCP',
  'INP',
  'CLS',
  'FCP',
  'TTFB',
] as const;

export type ReportedWebVital = (typeof REPORTED_WEB_VITALS)[number];

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Umbrales oficiales de web.dev: hasta `good` (incluido) es "good"; hasta `poor` (incluido),
 * "needs-improvement"; por encima, "poor". En milisegundos salvo CLS, que no tiene unidad.
 */
export const WEB_VITAL_THRESHOLDS: Record<
  ReportedWebVital,
  { good: number; poor: number }
> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Prefijo del `op` de las transacciones de Web Vitals (`web.vital.lcp`, `web.vital.cls`…).
 * GlitchTip agrupa las transacciones por nombre y `op`, así que cada par ruta + métrica tiene su
 * propia serie de tiempos.
 */
export const WEB_VITAL_OP_PREFIX = 'web.vital.';

/**
 * Lo único que sale de una medición: nombre, valor, clasificación, ruta normalizada, ambiente y
 * release. Nada de URL completa, query, usuario, cuenta ni dispositivo.
 */
export interface WebVitalReport {
  metric: ReportedWebVital;
  value: number;
  rating: WebVitalRating;
  route: string;
  environment: string;
  release: string | undefined;
}

/**
 * Indica si un nombre de métrica es uno de los que se reportan.
 *
 * @param name - `metric.name` tal como lo entrega `useReportWebVitals`.
 * @returns `true` para LCP, INP, CLS, FCP y TTFB.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isReportedWebVital('LCP'); // true
 * isReportedWebVital('FID'); // false
 * ```
 */
export function isReportedWebVital(name: string): name is ReportedWebVital {
  return (REPORTED_WEB_VITALS as readonly string[]).includes(name);
}

/**
 * Clasifica un valor con los umbrales oficiales (`WEB_VITAL_THRESHOLDS`).
 *
 * Se calcula aquí y no se toma el `rating` que trae la librería para que la regla sea explícita,
 * probada y la misma en cualquier versión de Next.
 *
 * @param metric - Métrica medida.
 * @param value - Valor en milisegundos (CLS sin unidad).
 * @returns `'good'`, `'needs-improvement'` o `'poor'`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * rateWebVital('LCP', 2100); // 'good'
 * rateWebVital('CLS', 0.3); // 'poor'
 * ```
 */
export function rateWebVital(
  metric: ReportedWebVital,
  value: number,
): WebVitalRating {
  const { good, poor } = WEB_VITAL_THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Arma el reporte de una medición con sólo los datos permitidos.
 *
 * Los tiempos se redondean al milisegundo y CLS a cuatro decimales: más precisión no aporta nada
 * y hace los valores más fáciles de leer en GlitchTip.
 *
 * @param input.metric - Métrica medida.
 * @param input.value - Valor crudo de la librería.
 * @param input.pathname - Ruta en la que se cargó la página; se normaliza (ver `normalizeRoute`).
 * @param input.environment - Ambiente del despliegue.
 * @param input.release - Release del build, si se conoce.
 * @returns El reporte listo para enviarse.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * buildWebVitalReport({
 *   metric: 'LCP', value: 2100.4, pathname: '/dashboard/documents?view=completed',
 *   environment: 'production', release: 'signature-app@abc123',
 * });
 * // { metric: 'LCP', value: 2100, rating: 'good', route: '/dashboard/documents', … }
 * ```
 */
export function buildWebVitalReport(input: {
  metric: ReportedWebVital;
  value: number;
  pathname: string;
  environment: string;
  release: string | undefined;
}): WebVitalReport {
  const value =
    input.metric === 'CLS'
      ? Math.round(input.value * 10_000) / 10_000
      : Math.round(input.value);
  return {
    metric: input.metric,
    value,
    rating: rateWebVital(input.metric, value),
    route: normalizeRoute(input.pathname),
    environment: input.environment,
    release: input.release,
  };
}

/**
 * Duración, en milisegundos, de la transacción que representa una medición.
 *
 * GlitchTip sólo grafica la duración de las transacciones, así que el valor de la métrica viaja
 * ahí. Las métricas de tiempo van tal cual; CLS no es un tiempo y va multiplicado por 1000 (un CLS
 * de 0.1 se ve como 100 ms). El valor real va además en la medición y en los atributos.
 *
 * @param report - Reporte de la medición.
 * @returns La duración de la transacción en milisegundos.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * webVitalTransactionDurationMs({ metric: 'CLS', value: 0.1, … }); // 100
 * ```
 */
export function webVitalTransactionDurationMs(report: WebVitalReport): number {
  return report.metric === 'CLS' ? report.value * 1000 : report.value;
}

/**
 * Indica si un evento es una transacción de Web Vitals.
 *
 * @param event - Evento armado por el SDK.
 * @returns `true` si su `op` empieza por `WEB_VITAL_OP_PREFIX`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isWebVitalTransaction({ type: 'transaction', contexts: { trace: { op: 'web.vital.lcp' } } }); // true
 * ```
 */
export function isWebVitalTransaction(event: Event): boolean {
  return Boolean(event.contexts?.trace?.op?.startsWith(WEB_VITAL_OP_PREFIX));
}

/** Atributos de la traza que llevan la URL completa, su query o su fragmento. */
const URL_TRACE_DATA_KEY = /^(url\.|http\.query$|http\.fragment$)/;

/** Query o fragmento dentro de un texto: desde `?` o `#` hasta el siguiente espacio. */
const QUERY_OR_FRAGMENT = /[?#]\S*/g;

/**
 * Borra de un mapa de atributos los que llevan la URL completa, su query o su fragmento.
 *
 * @param data - Atributos de la traza o de un span; se modifican en el lugar.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const data = { 'url.full': 'https://app.test/x?y=1', 'sentry.op': 'pageload' };
 * deleteUrlData(data); // data = { 'sentry.op': 'pageload' }
 * ```
 */
function deleteUrlData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  for (const key of Object.keys(data)) {
    if (URL_TRACE_DATA_KEY.test(key)) delete data[key];
  }
}

/**
 * Limpia una transacción del navegador antes de enviarla: la nombra con la ruta normalizada y le
 * quita la URL completa.
 *
 * - **Todas** (carga de página, navegación, Web Vitals): `transaction` pasa por `normalizeRoute`,
 *   para que GlitchTip agrupe por ruta y no por cada id de documento; `request.url` queda en
 *   origen + ruta normalizada, sin `query_string` ni `Referer`, y se borran los atributos `url.*`,
 *   `http.query` y `http.fragment` de la traza y de cada span hijo, cuyas descripciones también
 *   pierden query y fragmento. Sin `breadcrumbs`: los de navegación llevan la URL completa.
 * - **Web Vitals**, además: sin `request` (la integración HttpContext del SDK pone ahí la URL y el
 *   user agent completo), sin `user` ni `extra`, y sin más contexto que el de la
 *   traza. Sólo viaja lo de `WebVitalReport`.
 *
 * Muta el evento (es lo que espera `beforeSendTransaction`) y lo devuelve.
 *
 * @param event - Transacción armada por el SDK en el navegador.
 * @returns La misma transacción, limpia.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * scrubBrowserTransaction({
 *   type: 'transaction', transaction: '/dashboard/documents/6f1c',
 *   request: { url: 'https://app.test/dashboard/documents/6f1c?x=1#y' },
 * });
 * // transaction: '/dashboard/documents/[documentId]',
 * // request.url: 'https://app.test/dashboard/documents/[documentId]'
 * ```
 */
export function scrubBrowserTransaction<T extends Event>(event: T): T {
  if (event.transaction) {
    event.transaction = normalizeRoute(event.transaction);
  }

  // Los breadcrumbs de navegación llevan `from`/`to` con query y fragmento, y a una transacción
  // de rendimiento no le aportan nada.
  delete event.breadcrumbs;
  deleteUrlData(event.contexts?.trace?.data);
  // Los spans hijos de la carga (eventos del documento, recursos, peticiones a la API) repiten la
  // URL en sus atributos y en la descripción: una búsqueda, p. ej., lleva el término en la query.
  for (const span of event.spans ?? []) {
    deleteUrlData(span.data);
    if (span.description) {
      span.description = span.description.replace(QUERY_OR_FRAGMENT, '');
    }
  }

  if (isWebVitalTransaction(event)) {
    delete event.request;
    delete event.user;
    delete event.extra;
    // Fuera `culture` (idioma y zona horaria), `react` y cualquier otro contexto del dispositivo:
    // para una medición sólo hace falta la traza que la vincula con la carga.
    event.contexts = event.contexts?.trace
      ? { trace: event.contexts.trace }
      : undefined;
    return event;
  }

  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      event.request.url = `${url.origin}${normalizeRoute(url.pathname)}`;
    } catch {
      delete event.request.url;
    }
  }
  delete event.request?.query_string;
  // El `Referer` es la URL completa de la página anterior, con su query.
  for (const name of Object.keys(event.request?.headers ?? {})) {
    if (name.toLowerCase() === 'referer') delete event.request?.headers?.[name];
  }

  return event;
}
