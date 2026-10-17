import * as Sentry from '@sentry/nextjs';

import { buildSentryOptions } from '@/lib/sentry/sentry-options';

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
 */
Sentry.init({
  ...buildSentryOptions(),
  integrations: [Sentry.browserTracingIntegration()],
});
