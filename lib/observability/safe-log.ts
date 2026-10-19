import * as Sentry from '@sentry/nextjs';
import { isAxiosError, isCancel } from 'axios';

import {
  buildApiRequestRecord,
  classifyApiFailure,
  elapsedSince,
  normalizeApiRoute,
  type FailureCategory,
} from './api-request';

/**
 * Logs mínimos y seguros (historia "Eliminar logs HTTP sensibles del navegador").
 *
 * **Primera barrera.** La app no le pasa a `console.*` objetos de error ni cuerpos: un
 * `AxiosError` incorpora la config original —con el `Authorization` y el cuerpo enviado (en el
 * login, correo y contraseña; en el registro, RFC y CURP)— y la respuesta con su cuerpo. La
 * integración de consola de Sentry convierte cada `console.*` en un breadcrumb que viaja a
 * GlitchTip, así que imprimir el objeto era enviarlo. Aquí se reduce a lo que sirve para
 * diagnosticar sin exponer a nadie; el detalle se queda en los logs del backend, con su retención
 * y su control de acceso.
 *
 * - **Desarrollo**: un log de consola con sólo el resumen.
 * - **Producción, navegador**: nada en consola; un breadcrumb con el resumen para el siguiente
 *   evento.
 * - **Servidor**: el resumen en la consola de Node (ver `logSafeError`).
 *
 * La segunda barrera, por si algo se escapa, es `./sensitive-data.ts` en `beforeSend`.
 */

/** Lo único que se registra de una petición de `apiClient`. */
export interface SafeHttpLog {
  method: string;
  route: string;
  /** Código HTTP; `null` si no hubo respuesta. */
  status: number | null;
  duration_ms: number;
  /** Sólo en los fallos. */
  failure_category?: FailureCategory;
}

/** Lo único que se registra de un error cualquiera. */
export interface SafeErrorSummary {
  /** `AxiosError`, `TypeError`, `BackendRequestError`… */
  name: string;
  /** Código de axios (`ERR_NETWORK`, `ECONNABORTED`…), si lo trae. */
  error_code?: string;
  /** Código HTTP de la respuesta, si la hubo. */
  status?: number;
  /** Petición que falló, si es de axios y va a `/api/*`. */
  method?: string;
  route?: string;
  failure_category?: FailureCategory;
  /** `digest` de Next en los errores de servidor: enlaza con el log del servidor sin exponerlo. */
  digest?: string;
}

/**
 * Si se escriben logs en consola. Sólo en desarrollo: en producción la consola del navegador no
 * la lee nadie y cada línea se convierte en un breadcrumb.
 *
 * @returns `true` con `NODE_ENV=development`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * if (isConsoleLoggingEnabled()) console.debug('…');
 * ```
 */
export function isConsoleLoggingEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Resume un error con datos que no identifican a nadie: tipo, código, estado HTTP y, si es una
 * petición de axios, método, ruta normalizada y categoría del fallo.
 *
 * Nunca incluye el mensaje: en un `AxiosError` es genérico, pero en otros errores puede ser el
 * texto del backend con el correo o el RFC de alguien. Tampoco la config, la respuesta, la URL
 * completa ni la pila.
 *
 * @param error - Lo que se atrapó.
 * @returns El resumen.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * summarizeError(axiosError);
 * // { name: 'AxiosError', error_code: 'ERR_BAD_RESPONSE', status: 500, method: 'POST',
 * //   route: '/api/v1/auth/login', failure_category: 'server' }
 * ```
 */
export function summarizeError(error: unknown): SafeErrorSummary {
  if (isAxiosError(error) || isCancel(error)) {
    const config = (
      error as { config?: { method?: string; url?: string; baseURL?: string } }
    ).config;
    const summary: SafeErrorSummary = {
      name: isCancel(error) ? 'CanceledError' : 'AxiosError',
      failure_category: classifyApiFailure(error),
    };
    if (isAxiosError(error)) {
      if (error.code) summary.error_code = error.code;
      if (error.response?.status !== undefined) {
        summary.status = error.response.status;
      }
    }
    const route = normalizeApiRoute(config?.url, config?.baseURL ?? '/api');
    if (route) {
      summary.method = (config?.method ?? 'GET').toUpperCase();
      summary.route = route;
    }
    return summary;
  }

  if (error instanceof Error) {
    const summary: SafeErrorSummary = { name: error.name || 'Error' };
    const { status, digest } = error as { status?: unknown; digest?: unknown };
    if (typeof status === 'number') summary.status = status;
    if (typeof digest === 'string') summary.digest = digest;
    return summary;
  }

  return { name: typeof error };
}

/**
 * Registra un error atrapado sin exponer sus datos. Sustituye a `console.error('[contexto]',
 * error)`.
 *
 * - **Servidor** (server actions, Server Components): siempre a la consola de Node, que es el log
 *   del servidor; el SDK de Node también la convierte en breadcrumb, ya con sólo el resumen.
 * - **Navegador**: en desarrollo, a la consola; en producción, como breadcrumb `app.error`.
 *
 * Nunca lanza.
 *
 * @param scope - Dónde ocurrió, p. ej. `'[login] falló el inicio de sesión'`. Texto fijo: no
 *   interpolar datos del usuario.
 * @param error - Lo que se atrapó.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * onError: (error) => logSafeError('[register] falló la creación de cuenta', error),
 * ```
 */
export function logSafeError(scope: string, error: unknown): void {
  try {
    logSafeSummary(scope, summarizeError(error));
  } catch {
    // Registrar nunca debe romper el flujo que falló.
  }
}

/**
 * Registra un resumen ya armado, con las mismas reglas que `logSafeError`. Para los fallos que no
 * son una excepción, como una respuesta `fetch` con estado de error.
 *
 * Nunca lanza.
 *
 * @param scope - Dónde ocurrió. Texto fijo: no interpolar datos del usuario.
 * @param summary - Resumen con sólo datos seguros.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * logSafeSummary('[XML canónico] El backend rechazó la descarga', { name: 'HttpError', status: 404 });
 * ```
 */
export function logSafeSummary(scope: string, summary: SafeErrorSummary): void {
  try {
    if (typeof window === 'undefined' || isConsoleLoggingEnabled()) {
      console.error(scope, summary);
      return;
    }
    Sentry.addBreadcrumb({
      category: 'app.error',
      level: 'error',
      message: scope,
      data: { ...summary },
    });
  } catch {
    // Registrar nunca debe romper el flujo que falló.
  }
}

/**
 * Arma el log seguro de una petición terminada de `apiClient`.
 *
 * @param input.config - Config de axios (`response.config` / `error.config`).
 * @param input.status - Código HTTP, si hubo respuesta.
 * @param input.error - Lo que rechazó axios, en un fallo.
 * @returns El log, o `null` si la petición no va a `/api/*`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * buildSafeHttpLog({ config: response.config, status: 200 });
 * // { method: 'GET', route: '/api/v1/document/:id', status: 200, duration_ms: 84 }
 * ```
 */
export function buildSafeHttpLog(input: {
  config: { method?: string; url?: string; baseURL?: string } | undefined;
  status: number | undefined;
  error?: unknown;
}): SafeHttpLog | null {
  const record = buildApiRequestRecord({
    method: input.config?.method,
    url: input.config?.url,
    baseURL: input.config?.baseURL,
    status: input.status,
    durationMs: elapsedSince(input.config),
    failure:
      input.error === undefined ? undefined : classifyApiFailure(input.error),
  });
  if (!record) return null;

  const log: SafeHttpLog = {
    method: record.method,
    route: record.route,
    status: input.status ?? null,
    duration_ms: record.duration_ms,
  };
  if (record.failure_category) log.failure_category = record.failure_category;
  return log;
}

/**
 * Registra una petición de `apiClient`: en desarrollo, una línea de consola con sólo el log
 * seguro; en producción, el breadcrumb `api.request` con lo mismo. Nunca el cuerpo, los headers
 * ni la query.
 *
 * Nunca lanza.
 *
 * @param log - Log seguro de la petición (`buildSafeHttpLog`).
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const log = buildSafeHttpLog({ config: response.config, status: response.status });
 * if (log) reportSafeHttpLog(log);
 * ```
 */
export function reportSafeHttpLog(log: SafeHttpLog): void {
  try {
    if (isConsoleLoggingEnabled()) {
      if (log.failure_category) console.warn('[API]', log);
      else console.debug('[API]', log);
      return;
    }
    Sentry.addBreadcrumb({
      type: 'http',
      category: 'api.request',
      level: log.failure_category ? 'warning' : 'info',
      data: { ...log },
    });
  } catch {
    // La telemetría es pasiva: si falla, la petición sigue su curso.
  }
}
