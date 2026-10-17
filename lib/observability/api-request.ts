import { isAxiosError, isCancel } from 'axios';

/**
 * Datos de una petición de `apiClient` que se pueden registrar sin riesgo: método, ruta
 * normalizada (sin ids ni query), clase de estado, duración y resultado.
 *
 * Es la parte pura de la instrumentación de axios (historia "Instrumentar Axios para latencia y
 * fallos de API"): normaliza, clasifica y mide, sin enviar nada. La usan los logs seguros de
 * `./safe-log.ts`.
 */

export type ApiOutcome = 'success' | 'failure';

export type FailureCategory =
  'network' | 'timeout' | 'client' | 'server' | 'cancelled';

/** Familia del código HTTP; `'none'` cuando no hubo respuesta (red, timeout, cancelación). */
export type StatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx' | 'none';

/** Lo único que se registra de una petición. */
export interface ApiRequestRecord {
  method: string;
  route: string;
  status_class: StatusClass;
  duration_ms: number;
  outcome: ApiOutcome;
  /** Sólo en los fallos. */
  failure_category?: FailureCategory;
}

/** Lo que sustituye a un segmento dinámico de la ruta (id, token, correo…). */
export const DYNAMIC_SEGMENT = ':id';

/**
 * Segmento que puede salir tal cual: palabras en minúsculas separadas por guiones
 * (`personal-information`) o la versión de la API (`v1`). Todo lo demás —con dígitos,
 * mayúsculas, `@`, puntos— se trata como dato: un UUID, un token de invitación o un correo.
 */
const STATIC_SEGMENT = /^(?:[a-z]+(?:-[a-z]+)*|v\d+)$/;

/** Una palabra más larga que esto no es un nombre de recurso: se trata como dato. */
const MAX_STATIC_SEGMENT_LENGTH = 32;

/** Prefijo de las rutas internas: lo que pasa por el proxy de Next hacia `signature-server`. */
const INTERNAL_PREFIX = '/api/';

const KNOWN_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

/**
 * Une `baseURL` y `url` como lo hace axios (`combineURLs`), sin duplicar barras.
 *
 * @param baseURL - Base del cliente, p. ej. `/api`.
 * @param url - Ruta de la petición, relativa a la base.
 * @returns La ruta completa.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * joinPath('/api', '/api/v1/document'); // '/api/api/v1/document'
 * ```
 */
function joinPath(baseURL: string, url: string): string {
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Normaliza la ruta de una petición de `apiClient`: quita query y fragmento y cambia cada
 * segmento dinámico por `DYNAMIC_SEGMENT`.
 *
 * Sólo mide rutas internas: las que, una vez unidas a `baseURL`, van a `/api/*` del mismo origen.
 * Una URL absoluta a otro dominio (MinIO, un tercero) devuelve `null` y no se registra.
 *
 * La ruta que se devuelve es la que aparece en el código (`config.url`), no la que viaja con la
 * base antepuesta: es la que se reconoce al buscar quién hace la llamada.
 *
 * @param url - `config.url` de axios.
 * @param baseURL - `config.baseURL` de axios (por omisión `/api`, la de `apiClient`).
 * @param origin - Origen de la página, para reconocer URLs absolutas propias.
 * @returns La ruta normalizada, o `null` si la petición no es interna.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeApiRoute('/api/v1/document/6f1c2a90-1b2c/reject?x=1'); // '/api/v1/document/:id/reject'
 * normalizeApiRoute('https://minio.example.com/bucket/file.pdf'); // null
 * ```
 */
export function normalizeApiRoute(
  url: string | undefined,
  baseURL = '/api',
  origin = typeof window === 'undefined' ? undefined : window.location.origin,
): string | null {
  if (!url) return null;

  let path: string;
  let fullPath: string;
  if (/^([a-z][a-z\d+.-]*:)?\/\//i.test(url)) {
    let parsed: URL;
    try {
      parsed = new URL(url, origin);
    } catch {
      return null;
    }
    if (!origin || parsed.origin !== origin) return null;
    path = parsed.pathname;
    fullPath = parsed.pathname;
  } else {
    path = url.split(/[?#]/, 1)[0];
    fullPath = joinPath(baseURL, path);
  }

  if (!fullPath.startsWith(INTERNAL_PREFIX)) return null;

  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      STATIC_SEGMENT.test(segment) &&
      segment.length <= MAX_STATIC_SEGMENT_LENGTH
        ? segment
        : DYNAMIC_SEGMENT,
    );
  return `/${segments.join('/')}`;
}

/**
 * Familia de un código HTTP.
 *
 * @param status - Código de la respuesta; `undefined` si no la hubo.
 * @returns `'2xx'`, `'4xx'`… o `'none'` sin respuesta o con un código fuera de rango.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toStatusClass(201); // '2xx'
 * toStatusClass(undefined); // 'none'
 * ```
 */
export function toStatusClass(status: number | undefined): StatusClass {
  if (status === undefined || status < 100 || status > 599) return 'none';
  return `${Math.floor(status / 100)}xx` as StatusClass;
}

/**
 * Clasifica el fallo de una petición.
 *
 * El orden importa: una cancelación o un timeout no traen respuesta, así que se miran antes de
 * caer en `network`.
 *
 * - `cancelled`: `AbortController`/`CancelToken` (React Query cancela al desmontar), o el
 *   navegador abortó la petición (`ECONNABORTED` con "Request aborted", p. ej. al salir de la
 *   página). Ésa no es un timeout aunque comparta código.
 * - `timeout`: `ETIMEDOUT`, o `ECONNABORTED` por el `timeout` de axios.
 * - `client` / `server`: respuesta 4xx / 5xx. Cualquier otro código que axios rechace cuenta
 *   como `client`: lo decide la validación del cliente, no el servidor.
 * - `network`: no hubo respuesta (sin conexión, CORS, DNS, servidor caído).
 *
 * @param error - Lo que rechazó axios.
 * @returns La categoría del fallo.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * classifyApiFailure(new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED')); // 'timeout'
 * ```
 */
export function classifyApiFailure(error: unknown): FailureCategory {
  if (isCancel(error)) return 'cancelled';
  if (!isAxiosError(error)) return 'network';

  if (error.code === 'ETIMEDOUT') return 'timeout';
  if (error.code === 'ECONNABORTED') {
    return /aborted/i.test(error.message) ? 'cancelled' : 'timeout';
  }

  const status = error.response?.status;
  if (status === undefined) return 'network';
  return status >= 500 && status <= 599 ? 'server' : 'client';
}

/** Hora de inicio de cada petición, por su config (la misma referencia llega a la respuesta). */
const startTimes = new WeakMap<object, number>();

/**
 * Marca la hora de inicio de una petición. Se llama en el interceptor de request.
 *
 * @param config - Config de axios de la petición.
 * @param now - Reloj; por omisión `performance.now()`.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * apiClient.interceptors.request.use((config) => { markApiRequestStart(config); return config; });
 * ```
 */
export function markApiRequestStart(
  config: object,
  now: number = performance.now(),
): void {
  startTimes.set(config, now);
}

/**
 * Arma el registro de una petición terminada.
 *
 * @param input.method - Método HTTP; lo desconocido se agrupa como `OTHER`.
 * @param input.url - `config.url`.
 * @param input.baseURL - `config.baseURL`.
 * @param input.status - Código de la respuesta, si la hubo.
 * @param input.durationMs - Duración medida.
 * @param input.failure - Categoría del fallo; ausente en un éxito.
 * @returns El registro, o `null` si la petición no es interna.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * buildApiRequestRecord({ method: 'post', url: '/api/v1/document', status: 201, durationMs: 1840.2 });
 * // { method: 'POST', route: '/api/v1/document', status_class: '2xx', duration_ms: 1840, outcome: 'success' }
 * ```
 */
export function buildApiRequestRecord(input: {
  method: string | undefined;
  url: string | undefined;
  baseURL?: string;
  status: number | undefined;
  durationMs: number;
  failure?: FailureCategory;
}): ApiRequestRecord | null {
  const route = normalizeApiRoute(input.url, input.baseURL ?? '/api');
  if (route === null) return null;

  const method = (input.method ?? 'GET').toUpperCase();
  const record: ApiRequestRecord = {
    method: KNOWN_METHODS.has(method) ? method : 'OTHER',
    route,
    status_class: toStatusClass(input.status),
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    outcome: input.failure ? 'failure' : 'success',
  };
  if (input.failure) record.failure_category = input.failure;
  return record;
}

/**
 * Lee la duración de una petición desde su hora de inicio.
 *
 * @param config - Config de axios de la petición.
 * @param now - Reloj; por omisión `performance.now()`.
 * @returns Milisegundos transcurridos, o `0` si no se marcó el inicio.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * elapsedSince(response.config); // 1840.2
 * ```
 */
export function elapsedSince(
  config: object | undefined,
  now: number = performance.now(),
): number {
  const start = config ? startTimes.get(config) : undefined;
  return start === undefined ? 0 : now - start;
}
