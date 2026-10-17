import * as Sentry from '@sentry/nextjs';

import {
  buildSentryOptions,
  scrubSensitiveRequestData,
} from '@/lib/sentry/sentry-options';
import { scrubBrowserTransaction } from '@/lib/observability/web-vitals';

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
 * Las transacciones del navegador (carga de página, navegación y Web Vitals, ver
 * `WebVitalsReporter`) pasan además por `scrubBrowserTransaction`: salen nombradas con la ruta
 * normalizada —sin ids de documento u organización— y sin la URL completa.
 */
Sentry.init({
  ...buildSentryOptions(),
  // `enableInp: false`: el SDK mandaría INP como span suelto, que no pasa por
  // `beforeSendTransaction` y que GlitchTip no procesa. Lo reporta `WebVitalsReporter`.
  integrations: [Sentry.browserTracingIntegration({ enableInp: false })],
  beforeSendTransaction: (event) =>
    scrubBrowserTransaction(scrubSensitiveRequestData(event)),
});
