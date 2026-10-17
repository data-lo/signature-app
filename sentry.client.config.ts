import * as Sentry from '@sentry/nextjs';

import {
  buildSentryOptions,
  scrubSensitiveRequestData,
} from '@/lib/sentry/sentry-options';
import {
  filterApiErrorEvent,
  releaseRequestSpan,
  trackRequestSpan,
} from '@/lib/observability/api-request';

/**
 * Sentry (GlitchTip) en el navegador.
 *
 * No lo carga Next por sí solo: lo importa `instrumentation-client.ts`, que es el archivo que Next
 * ejecuta en el cliente antes de hidratar. Con Turbopack (`next dev/build --turbopack`) este
 * archivo sólo se inyectaría a través del plugin de webpack de `withSentryConfig`, que aquí no
 * se usa (los source maps están fuera del alcance), así que el import explícito es lo que lo hace
 * correr.
 *
 * Los errores no controlados (`window.onerror`, promesas rechazadas sin `catch`) los captura la
 * integración por omisión del SDK; no hace falta registrar nada más.
 *
 * Peticiones a la API (ver `lib/observability/api-request.ts`):
 * - El SDK sigue creando el span `http.client` de cada XHR; `onRequestSpanStart`/`End` lo
 *   entregan para que los interceptores de `apiClient` lo completen con la ruta normalizada y el
 *   resultado, en vez de crear un span duplicado.
 * - El breadcrumb `xhr` del SDK se apaga: lleva la URL completa con query (y, en las descargas de
 *   MinIO, la firma de la URL prefirmada). Para `/api/*` lo sustituye el breadcrumb
 *   `api.request`, que sólo lleva método, ruta normalizada, clase de estado, duración y resultado.
 * - `beforeSend` descarta el `AxiosError` crudo que llegue como excepción no controlada: el fallo
 *   ya se registró clasificado.
 */
Sentry.init({
  ...buildSentryOptions(),
  integrations: [
    Sentry.browserTracingIntegration({
      onRequestSpanStart: trackRequestSpan,
      onRequestSpanEnd: releaseRequestSpan,
    }),
    Sentry.breadcrumbsIntegration({ xhr: false }),
  ],
  beforeSend: (event, hint) => {
    const kept = filterApiErrorEvent(event, hint);
    return kept && scrubSensitiveRequestData(kept);
  },
});
