import type { ErrorEvent, Event } from '@sentry/nextjs';

import {
  redactEvent,
  scrubBreadcrumb,
} from '@/lib/observability/sensitive-data';

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
 * @returns El mismo evento, sin `request.cookies` y sin los encabezados de `SENSITIVE_HEADER_NAMES`.
 *
 * @example
 * ```ts
 * scrubSensitiveRequestData({
 *   request: { headers: { Authorization: 'Bearer x', 'user-agent': 'jest' }, cookies: { token: 'x' } },
 * });
 * // { request: { headers: { 'user-agent': 'jest' } } }
 * ```
 */
export function scrubSensitiveRequestData<T extends Event>(event: T): T {
  const request = event.request;
  if (!request) return event;

  delete request.cookies;

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
 * - **Trazas** al `PRODUCTION_TRACES_SAMPLE_RATE` en producción y completas en desarrollo.
 *   `traceLifecycle: 'static'` envía las transacciones clásicas, que son las que GlitchTip
 *   ingiere; el modo por omisión de la v11 (`'stream'`) manda spans sueltos que GlitchTip no
 *   procesa.
 * - **Datos personales**: la v11 recoge por omisión cookies, encabezados y cuerpos de petición.
 *   Aquí se apaga lo que puede traer sesión o contenido del usuario (cookies, cuerpos, query
 *   params, variables locales y `user.*`) y los encabezados se piden con lista de exclusión.
 *   `beforeSend`/`beforeSendTransaction` vuelven a limpiar el evento ya armado
 *   (`scrubSensitiveRequestData`).
 * - **Segunda barrera**: `beforeBreadcrumb` descarta los argumentos de los breadcrumbs de consola
 *   (un `AxiosError` impreso traería la config con el `Authorization` y los cuerpos) y redacta el
 *   resto; `beforeSend` redacta mensajes, excepciones, breadcrumbs y `extra` (ver
 *   `lib/observability/sensitive-data.ts`). La primera es no registrar esos datos
 *   (`lib/observability/safe-log.ts`).
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
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: (event: ErrorEvent) =>
      redactEvent(scrubSensitiveRequestData(event)),
    beforeSendTransaction: scrubSensitiveRequestData,
  };
}
