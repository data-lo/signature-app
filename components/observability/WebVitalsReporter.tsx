'use client';

import type { Span } from '@sentry/nextjs';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useCallback, useEffect, useRef } from 'react';

import {
  buildWebVitalReport,
  findActivePageloadSpan,
  isReportedWebVital,
  sendWebVitalReport,
  shouldSampleWebVitals,
} from '@/lib/observability/web-vitals';
import {
  resolveSentryEnvironment,
  resolveSentryRelease,
  resolveTracesSampleRate,
} from '@/lib/sentry/sentry-options';

/** Lo que se usa de la métrica que entrega `useReportWebVitals`. */
interface ReportedMetric {
  name: string;
  value: number;
}

/**
 * Reporta a GlitchTip los Web Vitals (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`) de la carga de página,
 * vinculados a su transacción `pageload` (ver `lib/observability/web-vitals.ts`).
 *
 * Se monta una sola vez, en `Providers`. No renderiza nada ni toca estado de la app: guarda en
 * refs la ruta y el `pageload` de la carga, la decisión de muestreo y las métricas ya enviadas.
 *
 * - **Ruta**: la de la carga de página (primer valor de `usePathname()`), normalizada. `CLS` e
 *   `INP` se entregan al ocultar la pestaña, quizá después de navegar a otra pantalla, pero
 *   describen la carga original.
 * - **Muestreo**: uno por carga, con la política de las trazas estándar (`shouldSampleWebVitals`).
 * - **Una vez por métrica**: en desarrollo, `StrictMode` monta el efecto de
 *   `useReportWebVitals` dos veces y cada métrica llegaría duplicada.
 * - **Pasivo**: cualquier fallo de la telemetría se traga; la navegación y el render siguen.
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
export function WebVitalsReporter(): null {
  const pathname = usePathname();
  const pageloadRouteRef = useRef(pathname);
  const pageloadSpanRef = useRef<Span | undefined>(undefined);
  const sampledRef = useRef<boolean | undefined>(undefined);
  const reportedRef = useRef(new Set<string>());

  // Se toma al montar, mientras el `pageload` sigue activo; las métricas llegan después.
  useEffect(() => {
    pageloadSpanRef.current ??= findActivePageloadSpan();
  }, []);

  const report = useCallback((metric: ReportedMetric) => {
    try {
      if (!isReportedWebVital(metric.name)) return;
      if (reportedRef.current.has(metric.name)) return;
      reportedRef.current.add(metric.name);

      pageloadSpanRef.current ??= findActivePageloadSpan();
      sampledRef.current ??= shouldSampleWebVitals(
        pageloadSpanRef.current,
        resolveTracesSampleRate(),
      );
      if (!sampledRef.current) return;

      sendWebVitalReport(
        buildWebVitalReport(
          metric.name,
          metric.value,
          pageloadRouteRef.current,
          resolveSentryEnvironment(),
          resolveSentryRelease(),
        ),
        pageloadSpanRef.current,
      );
    } catch {
      // La telemetría es pasiva: si falla, la página sigue igual.
    }
  }, []);

  useReportWebVitals(report);

  return null;
}
