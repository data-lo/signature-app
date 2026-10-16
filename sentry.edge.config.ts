import * as Sentry from '@sentry/nextjs';

import { buildSentryOptions } from '@/lib/sentry/sentry-options';

/**
 * Sentry (GlitchTip) en el runtime Edge de Next, donde corre `middleware.ts` (las guardas de
 * sesión y de rutas públicas).
 *
 * Lo carga `register()` de `instrumentation.ts` cuando `NEXT_RUNTIME === 'edge'`. Sin él, un
 * error en el middleware no llegaría a GlitchTip: el runtime Node no lo ve.
 */
Sentry.init(buildSentryOptions());
