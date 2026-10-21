import * as Sentry from '@sentry/nextjs';

/**
 * Arranca Sentry (GlitchTip) en el runtime del servidor que esté levantando Next.
 *
 * Next llama a `register()` una vez por runtime al iniciar. Cada configuración se importa sólo en
 * el suyo: la de Node arrastra dependencias que no existen en Edge, y al revés.
 *
 * @returns Una promesa que se resuelve cuando la configuración del runtime ya corrió.
 *
 * @example
 * ```ts
 * // Lo invoca Next al arrancar; no se llama a mano.
 * await register();
 * ```
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Reporta a GlitchTip los errores que Next atrapa en el servidor: Server Components, SSR, Server
 * Actions, rutas (`route.ts`) y middleware.
 *
 * Next la llama con el error, la petición y el contexto de la ruta antes de pintar el `error.tsx`
 * que toque, así que un error que el usuario ve como pantalla de error también queda registrado.
 */
export const onRequestError = Sentry.captureRequestError;
