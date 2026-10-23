import * as Sentry from '@sentry/nextjs';

import { buildSentryOptions } from '@/lib/sentry/sentry-options';

/**
 * Sentry (GlitchTip) en el runtime Node.js de Next: Server Components, SSR, Server Actions y
 * rutas del servidor.
 *
 * Lo carga `register()` de `instrumentation.ts` cuando `NEXT_RUNTIME === 'nodejs'`. Los errores
 * de render y de rutas los entrega Next a `onRequestError` (también en `instrumentation.ts`),
 * que es quien los manda a GlitchTip con la ruta y el tipo de render.
 */
Sentry.init(buildSentryOptions());
