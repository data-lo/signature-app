import type { Event } from '@sentry/nextjs';

/**
 * Encabezados que nunca deben salir hacia GlitchTip, en minúsculas.
 *
 * `cookie` lleva el JWT de sesión (`setAuthToken`) y `authorization` el token Bearer que manda
 * `apiClient`; `set-cookie` y `proxy-authorization` son su equivalente en la respuesta y en un
 * proxy intermedio.
 */
export const SENSITIVE_HEADER_NAMES: readonly string[] = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
];

/** Muestreo de trazas en producción: bajo a propósito mientras se mide el volumen real. */
export const PRODUCTION_TRACES_SAMPLE_RATE = 0.1;

/** Nombre del proyecto en el `release`: `signature-app@<sha>`. */
export const RELEASE_NAME_PREFIX = 'signature-app@';

/**
 * Ambiente con el que se etiqueta cada evento.
 *
 * Sale de `NEXT_PUBLIC_SENTRY_ENVIRONMENT` y, sin ella, de `NODE_ENV`. Hace falta la variable
 * explícita porque el despliegue de `development` también se construye con
 * `NODE_ENV=production`: sin ella sus eventos se confundirían con los de producción.
 *
 * @returns El ambiente, p. ej. `'production'` o `'development'`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * resolveSentryEnvironment(); // 'development' con NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
 * ```
 */
export function resolveSentryEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'development'
  );
}

/**
 * Release con el que se etiqueta cada evento: `signature-app@<sha>`.
 *
 * El sha llega en `NEXT_PUBLIC_GIT_COMMIT_SHA` como argumento de build (el pipeline pasa
 * `github.sha`). Sin él no se inventa uno: los eventos salen sin release.
 *
 * @returns El release, o `undefined` si el build no conoce su commit.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * resolveSentryRelease(); // 'signature-app@3f2a9c1…'
 * ```
 */
export function resolveSentryRelease(): string | undefined {
  const sha = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA?.trim();
  return sha ? `${RELEASE_NAME_PREFIX}${sha}` : undefined;
}

/**
 * Quita cookies y encabezados de autorización de un evento antes de transmitirlo.
 *
 * Es la segunda barrera: `dataCollection` (ver `buildSentryOptions`) ya le dice al SDK que no los
 * recoja, pero cualquier integración, versión nueva del SDK o `setContext` manual podría volver a
 * colarlos. Este filtro corre al final, sobre el evento ya armado, y no depende de nada de eso.
 *
 * Muta el evento recibido (es lo que esperan `beforeSend`/`beforeSendTransaction`) y lo devuelve
 * para poder encadenarlo.
 *
 * @param event - Evento de error o transacción tal como lo armó el SDK.
 * También recorta query y fragmento de `request.url`: la integración HttpContext del navegador
 * copia ahí `location.href` completo aunque `dataCollection.urlQueryParams` esté apagado, y una
 * query puede llevar un token de invitación o de acceso.
 *
 * @param event - Evento de error o transacción tal como lo armó el SDK.
 * @returns El mismo evento, sin `request.cookies`, sin los encabezados de `SENSITIVE_HEADER_NAMES`
 * y con `request.url` sin query ni fragmento.
 *
 * @example
 * ```ts
 * scrubSensitiveRequestData({
 *   request: { url: 'https://app.test/join?token=x', headers: { Authorization: 'Bearer x', 'user-agent': 'jest' }, cookies: { token: 'x' } },
 * });
 * // { request: { url: 'https://app.test/join', headers: { 'user-agent': 'jest' } } }
 * ```
 */
export function scrubSensitiveRequestData<T extends Event>(event: T): T {
  const request = event.request;
  if (!request) return event;

  delete request.cookies;
  if (request.url) request.url = request.url.split(/[?#]/, 1)[0];

  if (request.headers) {
    for (const name of Object.keys(request.headers)) {
      if (SENSITIVE_HEADER_NAMES.includes(name.toLowerCase())) {
        delete request.headers[name];
      }
    }
  }

  return event;
}

/**
 * Opciones comunes de `Sentry.init` para navegador, servidor y edge, apuntando a GlitchTip.
 *
 * - **DSN** desde `NEXT_PUBLIC_SENTRY_DSN`, nunca escrito en código. Sin DSN el SDK queda
 *   deshabilitado (`enabled: false`): un entorno sin la variable no reporta, pero tampoco falla.
 *   Lleva `NEXT_PUBLIC_` porque el navegador también lo necesita, y Next lo incrusta en el bundle
 *   en tiempo de build (ver README, sección de variables de entorno).
 * - **Ambiente y release** en cada evento (`resolveSentryEnvironment`, `resolveSentryRelease`),
 *   para separar los despliegues y saber qué build produjo una medición o un error.
 * - **Trazas** al `PRODUCTION_TRACES_SAMPLE_RATE` en producción y completas en desarrollo.
 *   Los Web Vitals heredan esta misma decisión (ver `WebVitalsReporter`).
 *   `traceLifecycle: 'static'` envía las transacciones clásicas, que son las que GlitchTip
 *   ingiere; el modo por omisión de la v11 (`'stream'`) manda spans sueltos que GlitchTip no
 *   procesa.
 * - **Datos personales**: la v11 recoge por omisión cookies, encabezados y cuerpos de petición.
 *   Aquí se apaga lo que puede traer sesión o contenido del usuario (cookies, cuerpos, query
 *   params, variables locales y `user.*`) y los encabezados se piden con lista de exclusión.
 *   `beforeSend`/`beforeSendTransaction` vuelven a limpiar el evento ya armado
 *   (`scrubSensitiveRequestData`).
 *
 * @returns Las opciones compartidas; cada runtime agrega encima las suyas.
 *
 * @example
 * ```ts
 * Sentry.init({ ...buildSentryOptions() });
 * ```
 */
export function buildSentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease(),
    tracesSampleRate:
      process.env.NODE_ENV === 'production' ? PRODUCTION_TRACES_SAMPLE_RATE : 1,
    traceLifecycle: 'static' as const,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: [...SENSITIVE_HEADER_NAMES] },
        response: { deny: [...SENSITIVE_HEADER_NAMES] },
      },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubSensitiveRequestData,
    beforeSendTransaction: scrubSensitiveRequestData,
  };
}
