import * as Sentry from '@sentry/nextjs';

import './sentry.client.config';

/**
 * Punto de entrada de la instrumentación del navegador: Next lo ejecuta antes de hidratar la app.
 *
 * Importa `sentry.client.config.ts`, que es donde vive la configuración del cliente, y avisa al
 * SDK de cada navegación del App Router para que la transacción de la página nueva empiece en el
 * momento correcto.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
