import * as Sentry from '@sentry/nextjs';
import type { Event, Span } from '@sentry/nextjs';

/**
 * Web Vitals de la carga de página (historia "Reporte de Web Vitals de Next.js en la telemetría
 * de rendimiento").
 *
 * **Una señal por métrica y carga de página**: `WebVitalsReporter` recibe cada métrica de
 * `useReportWebVitals` y la manda como una transacción corta, hija de la transacción `pageload`
 * de esa carga (misma traza, `parent_span_id` = el `pageload`). No se cuelga como medición del
 * `pageload` mismo porque `CLS` e `INP` llegan al ocultar la pestaña, mucho después de que esa
 * transacción se cerró y se envió.
 *
 * **Cómo se ve en GlitchTip** (Performance agrupa por nombre y `op`):
 * - nombre `web_vital:<ruta normalizada>` → un grupo por pantalla;
 * - `op` `web_vital.<métrica>` → dentro de cada pantalla, una serie por métrica. En las de tiempo
 *   (`LCP`, `INP`, `FCP`, `TTFB`) la duración de la transacción es el valor, así que el p95 del
 *   grupo es el p95 de la métrica. `CLS` no es un tiempo: dura 0 y el valor va en la medición.
 * - etiquetas `metric`, `rating` y `route`; `environment` y `release` son las del evento.
 *
 * **Qué sale**: sólo `WebVitalReport`. Nunca la URL completa, query params, fragmentos, ids,
 * datos del usuario, encabezados ni el user agent (`scrubWebVitalTransaction`).
 */

/** Métricas que se reportan. `FID` (que Next también entrega) quedó reemplazada por `INP`. */
export const WEB_VITAL_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

export type WebVitalName = (typeof WEB_VITAL_NAMES)[number];

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/** Prefijo del `op` de las transacciones de Web Vitals (`web_vital.lcp`, …). */
export const WEB_VITAL_OP_PREFIX = 'web_vital';

/** Prefijo de los atributos de la señal en la transacción (`web_vital.metric`, …). */
const SIGNAL_ATTRIBUTE_PREFIX = 'web_vital.';

/**
 * Umbrales oficiales de web.dev (`good` hasta el primero inclusive, `poor` por encima del
 * segundo). Los de tiempo en ms; `CLS` sin unidad.
 */
export const WEB_VITAL_THRESHOLDS: Record<
  WebVitalName,
  readonly [good: number, poor: number]
> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

/** Ruta que se reporta cuando la URL no corresponde a ninguna pantalla conocida. */
export const UNMATCHED_ROUTE = '/[unmatched]';

/**
 * Pantallas de la app (`app/**\/page.tsx`), con los segmentos dinámicos entre corchetes.
 *
 * Es una lista cerrada a propósito: una URL que no case con ninguna sale como `UNMATCHED_ROUTE`
 * en vez de pasar tal cual, así un 404 con un correo o un token en la ruta nunca llega a
 * GlitchTip. La prueba de `WebVitalsReporter.spec.tsx` compara esta lista con el árbol de `app/`
 * para que una pantalla nueva no quede fuera sin que nadie se entere.
 */
export const ROUTE_TEMPLATES: readonly string[] = [
  '/access-document',
  '/dashboard',
  '/dashboard/directory',
  '/dashboard/documents',
  '/dashboard/documents/[documentId]',
  '/dashboard/documents/create',
  '/dashboard/organization/create',
  '/dashboard/organization/settings/information',
  '/dashboard/organization/settings/permissions',
  '/dashboard/organization/settings/roles',
  '/dashboard/organizations/[organizationId]/members',
  '/dashboard/personal-documents',
  '/dashboard/personal-documents/identity',
  '/dashboard/plans',
  '/dashboard/subscriptions',
  '/dashboard/unauthorized',
  '/error',
  '/forgot-password',
  '/join',
  '/login',
  '/public/documents/[id]',
  '/public/documents/[id]/advanced-signature',
  '/public/documents/[id]/biometric-signature',
  '/public/documents/[id]/sign',
  '/public/documents/[id]/signatures/[collaboratorId]',
  '/signature-capture',
  '/signup',
  '/signup/verify',
];

/** Lo único que se registra de una métrica. */
export interface WebVitalReport {
  metric: WebVitalName;
  value: number;
  rating: WebVitalRating;
  route: string;
  environment: string;
  release: string | undefined;
}

/**
 * Indica si una métrica de `useReportWebVitals` es de las que se reportan.
 *
 * @param name - `metric.name`.
 * @returns `true` para `LCP`, `INP`, `CLS`, `FCP` y `TTFB`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isReportedWebVital('LCP'); // true
 * isReportedWebVital('FID'); // false
 * ```
 */
export function isReportedWebVital(name: string): name is WebVitalName {
  return (WEB_VITAL_NAMES as readonly string[]).includes(name);
}

/**
 * Clasifica un valor según los umbrales oficiales (`WEB_VITAL_THRESHOLDS`).
 *
 * Se calcula aquí y no se toma `metric.rating` tal cual para que la clasificación no dependa de
 * la versión de `web-vitals` que traiga Next.
 *
 * @param name - Métrica.
 * @param value - Valor (ms, o sin unidad en `CLS`).
 * @returns `good`, `needs-improvement` o `poor`.
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
  name: WebVitalName,
  value: number,
): WebVitalRating {
  const [good, poor] = WEB_VITAL_THRESHOLDS[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Normaliza una ruta a su pantalla, sin ids, query params ni fragmentos.
 *
 * Gana la plantilla con menos segmentos dinámicos, así `/dashboard/documents/create` no se
 * confunde con `/dashboard/documents/[documentId]`.
 *
 * @param pathname - Ruta tal como la da `usePathname()` (se recorta igual cualquier `?` o `#`).
 * @returns La plantilla de `ROUTE_TEMPLATES` que le corresponde, o `UNMATCHED_ROUTE`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeRoute('/dashboard/documents/9b2c…?view=completed'); // '/dashboard/documents/[documentId]'
 * normalizeRoute('/public/documents/42/sign'); // '/public/documents/[id]/sign'
 * ```
 */
export function normalizeRoute(pathname: string | null | undefined): string {
  const path = (pathname ?? '').split(/[?#]/, 1)[0];
  const segments = path.split('/').filter(Boolean);

  let best: { template: string; dynamic: number } | undefined;
  for (const template of ROUTE_TEMPLATES) {
    const parts = template.split('/').filter(Boolean);
    if (parts.length !== segments.length) continue;

    let dynamic = 0;
    const matches = parts.every((part, index) => {
      if (part.startsWith('[')) {
        dynamic += 1;
        return true;
      }
      return part === segments[index];
    });
    if (matches && (!best || dynamic < best.dynamic)) {
      best = { template, dynamic };
    }
  }
  return best?.template ?? UNMATCHED_ROUTE;
}

/**
 * Arma la señal de una métrica.
 *
 * @param name - Métrica admitida.
 * @param value - `metric.value`.
 * @param pathname - Ruta de la carga de página; se normaliza.
 * @param environment - Ambiente de Sentry (`resolveSentryEnvironment`).
 * @param release - Release de Sentry (`resolveSentryRelease`).
 * @returns La señal, con el valor redondeado (4 decimales en `CLS`, ms enteros en el resto).
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * buildWebVitalReport('LCP', 2100.4, '/dashboard/documents', 'production', 'signature-app@abc');
 * // { metric: 'LCP', value: 2100, rating: 'good', route: '/dashboard/documents', environment: 'production', release: 'signature-app@abc' }
 * ```
 */
export function buildWebVitalReport(
  name: WebVitalName,
  value: number,
  pathname: string | null | undefined,
  environment: string,
  release: string | undefined,
): WebVitalReport {
  const rounded =
    name === 'CLS'
      ? Math.round(Math.max(0, value) * 10_000) / 10_000
      : Math.max(0, Math.round(value));
  return {
    metric: name,
    value: rounded,
    rating: rateWebVital(name, rounded),
    route: normalizeRoute(pathname),
    environment,
    release,
  };
}

/** Bandera W3C de traza muestreada en `spanContext().traceFlags`. */
const TRACE_FLAG_SAMPLED = 1;

/**
 * Busca la transacción `pageload` en curso.
 *
 * `browserTracingIntegration` la deja como span activo mientras dura la carga, así que basta con
 * subir a la raíz del span activo y comprobar su `op`. Después de una navegación (o si el SDK
 * está apagado) no hay `pageload` activo.
 *
 * @returns La transacción `pageload`, o `undefined`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const pageload = findActivePageloadSpan();
 * ```
 */
export function findActivePageloadSpan(): Span | undefined {
  try {
    const active = Sentry.getActiveSpan();
    if (!active) return undefined;
    const root = Sentry.getRootSpan(active);
    return Sentry.spanToStaticSpanJSON(root).op === 'pageload'
      ? root
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Decide si se reportan los Web Vitals de una carga de página, con la misma política que las
 * trazas estándar.
 *
 * Si se conoce el `pageload`, se hereda su decisión: las métricas salen exactamente en las cargas
 * cuya transacción también sale, y nunca quedan huérfanas. Si no (SDK sin `pageload`), se sortea
 * con la misma tasa (`resolveTracesSampleRate`).
 *
 * @param pageload - Transacción `pageload` de la carga, si se encontró.
 * @param sampleRate - Tasa de muestreo de las trazas del cliente.
 * @param random - Fuente de azar en `[0, 1)`; por omisión `Math.random`.
 * @returns `true` si se reporta.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * shouldSampleWebVitals(undefined, 0.1, () => 0.05); // true
 * ```
 */
export function shouldSampleWebVitals(
  pageload: Span | undefined,
  sampleRate: number,
  random: () => number = Math.random,
): boolean {
  if (pageload) {
    return (pageload.spanContext().traceFlags & TRACE_FLAG_SAMPLED) !== 0;
  }
  return random() < sampleRate;
}

/** Unidad de la medición de cada métrica. */
const MEASUREMENT_UNIT: Record<WebVitalName, string> = {
  LCP: 'millisecond',
  INP: 'millisecond',
  CLS: '',
  FCP: 'millisecond',
  TTFB: 'millisecond',
};

/**
 * Manda una señal a GlitchTip como transacción hija del `pageload` (ver el encabezado del
 * módulo). La decisión de muestreo ya se tomó: aquí no se vuelve a sortear
 * (`webVitalAwareTracesSampler`).
 *
 * @param report - Señal de la métrica.
 * @param pageload - Transacción `pageload` de la carga; sin ella la señal abre su propia traza.
 * @param nowSeconds - Momento de cierre, en segundos (reloj del SDK).
 * @returns Nada.
 *
 * @throws Lo que lance el SDK; quien llama lo contiene.
 *
 * @example
 * ```ts
 * sendWebVitalReport(report, findActivePageloadSpan());
 * ```
 */
export function sendWebVitalReport(
  report: WebVitalReport,
  pageload: Span | undefined,
  nowSeconds: number = Date.now() / 1000,
): void {
  const key = report.metric.toLowerCase();
  const durationSeconds = report.metric === 'CLS' ? 0 : report.value / 1000;

  const span = Sentry.startInactiveSpan({
    name: `${WEB_VITAL_OP_PREFIX}:${report.route}`,
    op: `${WEB_VITAL_OP_PREFIX}.${key}`,
    forceTransaction: true,
    parentSpan: pageload ?? null,
    startTime: nowSeconds - durationSeconds,
    attributes: {
      [`${SIGNAL_ATTRIBUTE_PREFIX}metric`]: report.metric,
      [`${SIGNAL_ATTRIBUTE_PREFIX}value`]: report.value,
      [`${SIGNAL_ATTRIBUTE_PREFIX}rating`]: report.rating,
      [`${SIGNAL_ATTRIBUTE_PREFIX}route`]: report.route,
    },
  });
  Sentry.setMeasurement(
    key,
    report.value,
    MEASUREMENT_UNIT[report.metric],
    span,
  );
  span.end(nowSeconds);
}

/**
 * Envuelve el `tracesSampler` del navegador para que las transacciones de Web Vitals se envíen
 * siempre: ya pasaron por `shouldSampleWebVitals` con la tasa estándar, y volver a sortearlas
 * dejaría la tasa efectiva en su cuadrado.
 *
 * @param next - Sampler para todo lo demás.
 * @returns El sampler para `Sentry.init`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * Sentry.init({ tracesSampler: webVitalAwareTracesSampler(uploadAwareTracesSampler(rate)) });
 * ```
 */
export function webVitalAwareTracesSampler<
  C extends { attributes?: Record<string, unknown> },
>(next: (context: C) => number) {
  return (context: C): number => {
    const op = context.attributes?.['sentry.op'];
    if (typeof op === 'string' && op.startsWith(`${WEB_VITAL_OP_PREFIX}.`)) {
      return 1;
    }
    return next(context);
  };
}

/**
 * Indica si un evento es una transacción de Web Vitals.
 *
 * @param event - Evento armado por el SDK.
 * @returns `true` si su `op` empieza por `web_vital.`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isWebVitalTransaction({ type: 'transaction', contexts: { trace: { op: 'web_vital.lcp' } } }); // true
 * ```
 */
export function isWebVitalTransaction(event: Event): boolean {
  return Boolean(
    event.contexts?.trace?.op?.startsWith(`${WEB_VITAL_OP_PREFIX}.`),
  );
}

/**
 * Deja una transacción de Web Vitals con sólo la señal antes de enviarla. Va en
 * `beforeSendTransaction`.
 *
 * El SDK le agrega a toda transacción la URL completa de la página y el user agent (`request`),
 * breadcrumbs, contextos del dispositivo y del navegador, y el usuario si lo hubiera. Aquí queda
 * la traza (para el vínculo con el `pageload`), los atributos `web_vital.*` y los internos del
 * SDK (`sentry.*`), las mediciones y, como etiquetas, `metric`, `rating` y `route`. `environment`
 * y `release` siguen siendo los campos propios del evento. A las demás transacciones no les hace
 * nada.
 *
 * Muta el evento (es lo que espera `beforeSendTransaction`) y lo devuelve.
 *
 * @param event - Transacción armada por el SDK.
 * @returns La misma transacción; limpia si es de Web Vitals.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * beforeSendTransaction: (event) => scrubWebVitalTransaction(event)
 * ```
 */
export function scrubWebVitalTransaction<T extends Event>(event: T): T {
  if (!isWebVitalTransaction(event)) return event;

  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.spans;

  const trace = event.contexts?.trace;
  if (trace?.data) {
    for (const key of Object.keys(trace.data)) {
      if (
        !key.startsWith(SIGNAL_ATTRIBUTE_PREFIX) &&
        !key.startsWith('sentry.')
      ) {
        delete trace.data[key];
      }
    }
  }
  event.contexts = trace ? { trace } : undefined;

  const tags: Record<string, string> = {};
  for (const name of ['metric', 'rating', 'route']) {
    const value = trace?.data?.[`${SIGNAL_ATTRIBUTE_PREFIX}${name}`];
    if (value !== undefined) tags[name] = String(value);
  }
  event.tags = tags;
  return event;
}
