'use client';

import { useState } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';
import type { Span } from '@sentry/nextjs';
import {
  buildWebVitalReport,
  isReportedWebVital,
  WEB_VITAL_OP_PREFIX,
  webVitalTransactionDurationMs,
  type WebVitalReport,
} from '@/lib/observability/web-vitals';
import {
  resolveSentryEnvironment,
  resolveSentryRelease,
} from '@/lib/sentry/sentry-options';

/** Lo que entrega `useReportWebVitals`, reducido a lo que se lee. */
interface ReportedMetric {
  name: string;
  value: number;
}

/**
 * Busca la transacción de carga de página que está en curso.
 *
 * Se consulta al montar el reporter, durante la hidratación, que es cuando la transacción
 * `pageload` del SDK todavía está activa.
 *
 * @returns La transacción `pageload`, o `undefined` si no hay una activa (SDK apagado o ya
 * terminada).
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const pageload = findPageloadSpan();
 * ```
 */
function findPageloadSpan(): Span | undefined {
  const activeSpan = Sentry.getActiveSpan();
  if (!activeSpan) return undefined;
  const rootSpan = Sentry.getRootSpan(activeSpan);
  const op = Sentry.spanToJSON(rootSpan).attributes['sentry.op'];
  return op === 'pageload' ? rootSpan : undefined;
}

/**
 * Envía una medición a GlitchTip como una transacción propia, vinculada a la de carga de página.
 *
 * - **Vínculo**: la transacción toma como padre la de `pageload` (mismo `trace_id`), así que en
 *   GlitchTip aparece en la misma traza que la carga que midió. No se agrega como span hijo
 *   porque LCP, CLS e INP se conocen cuando la carga ya se envió.
 * - **Muestreo**: hereda la decisión de esa traza, que el SDK tomó con `tracesSampleRate`. Es el
 *   mismo porcentaje que el de las trazas sin sortear dos veces, y una carga no muestreada no
 *   reporta ninguna de sus métricas.
 * - **Agrupación**: nombre = ruta normalizada y `op` = `web.vital.<métrica>`. GlitchTip agrupa por
 *   ambos y grafica la duración, que lleva el valor (ver `webVitalTransactionDurationMs`): cada
 *   ruta tiene su serie por métrica y se ve cuál se degrada.
 * - **Sin alertas por medición**: es una transacción, no un error ni un mensaje, así que no abre
 *   incidencias en GlitchTip.
 *
 * @param report - Medición con sólo los datos permitidos.
 * @param pageloadSpan - Transacción de carga de página; sin ella se usa la traza actual.
 * @returns Nada.
 *
 * @throws Nada que deba atraparse: con el SDK apagado los spans no graban ni envían.
 *
 * @example
 * ```ts
 * sendWebVitalReport(buildWebVitalReport({ metric: 'LCP', value: 2100, … }), pageloadSpan);
 * ```
 */
export function sendWebVitalReport(
  report: WebVitalReport,
  pageloadSpan: Span | undefined,
): void {
  Sentry.withScope((scope) => {
    scope.setTags({
      'web_vital.metric': report.metric,
      'web_vital.rating': report.rating,
      route: report.route,
    });

    const endTime = Date.now() / 1000;
    const span = Sentry.startInactiveSpan({
      name: report.route,
      op: `${WEB_VITAL_OP_PREFIX}${report.metric.toLowerCase()}`,
      forceTransaction: true,
      // `null` y no `undefined`: sin carga de página, que no cuelgue de una navegación en curso.
      parentSpan: pageloadSpan ?? null,
      startTime: endTime - webVitalTransactionDurationMs(report) / 1000,
      attributes: {
        'web_vital.metric': report.metric,
        'web_vital.value': report.value,
        'web_vital.rating': report.rating,
        'web_vital.route': report.route,
      },
    });
    Sentry.setMeasurement(
      report.metric.toLowerCase(),
      report.value,
      report.metric === 'CLS' ? 'none' : 'millisecond',
      span,
    );
    span.end(endTime);
  });
}

/**
 * Crea el manejador que recibe las métricas de `useReportWebVitals`.
 *
 * Captura al crearse la ruta y la transacción de la carga: LCP, CLS e INP llegan tarde —al
 * ocultar la pestaña— y para entonces el usuario pudo haber navegado a otra ruta, pero describen
 * la página en la que se cargó la app.
 *
 * Descarta las repeticiones exactas (misma métrica y valor): en desarrollo, con `StrictMode`, el
 * efecto de Next se registra dos veces y cada medición llegaría duplicada.
 *
 * Nunca lanza: un fallo de telemetría no debe llegar a React.
 *
 * @param context.pathname - `location.pathname` de la carga.
 * @param context.pageloadSpan - Transacción de carga de página, si está activa.
 * @param context.send - Cómo se envía cada reporte (por omisión, `sendWebVitalReport`).
 * @returns El manejador para `useReportWebVitals`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const handler = createWebVitalsHandler({ pathname: '/dashboard', pageloadSpan: undefined });
 * handler({ name: 'LCP', value: 2100 });
 * ```
 */
export function createWebVitalsHandler({
  pathname,
  pageloadSpan,
  send = sendWebVitalReport,
}: {
  pathname: string;
  pageloadSpan: Span | undefined;
  send?: (report: WebVitalReport, pageloadSpan: Span | undefined) => void;
}): (metric: ReportedMetric) => void {
  const reported = new Set<string>();
  const environment = resolveSentryEnvironment();
  const release = resolveSentryRelease();

  return (metric) => {
    try {
      if (!isReportedWebVital(metric.name) || !Number.isFinite(metric.value)) {
        return;
      }
      const key = `${metric.name}:${metric.value}`;
      if (reported.has(key)) return;
      reported.add(key);

      send(
        buildWebVitalReport({
          metric: metric.name,
          value: metric.value,
          pathname,
          environment,
          release,
        }),
        pageloadSpan,
      );
    } catch {
      // La telemetría es pasiva: si falla, la página sigue igual.
    }
  };
}

/** Manejador inerte: en el servidor y con el SDK apagado no se mide nada. */
const ignoreMetric = () => {};

/**
 * Captura los Web Vitals (LCP, INP, CLS, FCP y TTFB) de la experiencia real del usuario y los
 * reporta a GlitchTip asociados a la transacción de carga de página.
 *
 * Se monta una sola vez, en `Providers`, así cubre rutas públicas y autenticadas. Es pasivo: no
 * pinta nada, no tiene estado que cambie y las mediciones las toma `web-vitals` con
 * `PerformanceObserver`, fuera del render. Sin DSN de GlitchTip las métricas se descartan sin
 * enviarse.
 *
 * Sólo sale lo de `WebVitalReport` (métrica, valor, clasificación, ruta normalizada, ambiente y
 * release); `scrubBrowserTransaction` quita del evento la URL completa, el user agent y lo demás.
 *
 * @returns `null`.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <QueryClientProvider client={queryClient}>
 *   <WebVitalsReporter />
 *   {children}
 * </QueryClientProvider>
 * ```
 */
export default function WebVitalsReporter() {
  // Estado y no `useMemo`: Next vuelve a registrar los observadores si cambia la referencia del
  // manejador, así que tiene que ser el mismo durante toda la vida de la página.
  const [handler] = useState(() =>
    typeof window === 'undefined' || !Sentry.isEnabled()
      ? ignoreMetric
      : createWebVitalsHandler({
          pathname: window.location.pathname,
          pageloadSpan: findPageloadSpan(),
        }),
  );
  useReportWebVitals(handler);
  return null;
}
