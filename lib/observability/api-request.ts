import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent, EventHint, Span } from '@sentry/nextjs';
import { isAxiosError, isCancel } from 'axios';

/**
 * Observabilidad de las peticiones de `apiClient` (historia "Instrumentar Axios para latencia y
 * fallos de API").
 *
 * **Qué ya hace el SDK y qué se completa aquí.** `browserTracingIntegration` crea un span
 * `http.client` por cada XHR —con método, duración y código HTTP— siempre que haya una
 * transacción activa (carga de página o navegación), y nunca crea transacciones propias. Le falta
 * la ruta normalizada (su nombre lleva el path crudo, con ids) y el resultado clasificado. Así que
 * aquí NO se crean spans ni transacciones: se renombra y se completa el span del SDK, se deja un
 * breadcrumb y, sólo para los fallos que conviene vigilar, se envía un evento. Nada se cuenta dos
 * veces.
 *
 * **Qué sale.** Sólo `ApiRequestRecord`: método, ruta normalizada, clase de estado, duración,
 * resultado y, en los fallos, su categoría. Nunca cuerpos, headers, query params, ni el
 * `AxiosError` (que lleva la config con el `Authorization` y el cuerpo de la respuesta).
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

/** Primer elemento del fingerprint de los eventos de API: es como `filterApiErrorEvent` los reconoce. */
export const API_EVENT_FINGERPRINT = 'api-request';

/** Categorías que se envían como evento: indican un problema del servicio o de la conexión. */
const REPORTED_FAILURES: ReadonlySet<FailureCategory> = new Set([
  'server',
  'network',
  'timeout',
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

/** Registro de cada `AxiosError` ya clasificado, para reconocerlo en `beforeSend`. */
const errorRecords = new WeakMap<object, ApiRequestRecord>();

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
 * Spans `http.client` abiertos por el SDK, por id. Los recibe `trackRequestSpan` desde
 * `onRequestSpanStart` y los toma `annotateRequestSpan` cuando axios termina.
 */
const requestSpans = new Map<string, Span>();

/** Tope de spans guardados: los de peticiones que no pasan por axios (fetch) no se consumen. */
const MAX_TRACKED_SPANS = 200;

/**
 * Guarda el span que el SDK abrió para una petición. Va en
 * `browserTracingIntegration({ onRequestSpanStart })`.
 *
 * @param span - Span `http.client` recién creado.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * Sentry.browserTracingIntegration({ onRequestSpanStart: trackRequestSpan });
 * ```
 */
export function trackRequestSpan(span: Span): void {
  requestSpans.set(span.spanContext().spanId, span);
  if (requestSpans.size > MAX_TRACKED_SPANS) {
    const oldest = requestSpans.keys().next().value;
    if (oldest !== undefined) requestSpans.delete(oldest);
  }
}

/**
 * Suelta el span de una petición que terminó. Va en
 * `browserTracingIntegration({ onRequestSpanEnd })`.
 *
 * Espera a la siguiente tarea: el SDK cierra el span en `readystatechange` y axios resuelve
 * después, en `loadend` del mismo XHR; sus interceptores todavía tienen que encontrarlo.
 *
 * @param span - Span `http.client` que acaba de cerrarse.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * Sentry.browserTracingIntegration({ onRequestSpanEnd: releaseRequestSpan });
 * ```
 */
export function releaseRequestSpan(span: Span): void {
  const spanId = span.spanContext().spanId;
  setTimeout(() => requestSpans.delete(spanId), 0);
}

/**
 * Completa el span `http.client` que el SDK creó para la petición, si lo hay.
 *
 * Lo renombra con la ruta normalizada (el SDK lo nombra con el path crudo, con ids), le agrega el
 * resultado y le quita la URL completa, su query y su fragmento. Sin transacción activa el SDK no
 * crea span y no hay nada que completar: de esa petición quedan el breadcrumb y, si falló, el
 * evento.
 *
 * @param record - Registro de la petición.
 * @param request - `response.request` / `error.request`: el XHR, donde el SDK anota el id de su span.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * annotateRequestSpan(record, response.request);
 * ```
 */
export function annotateRequestSpan(
  record: ApiRequestRecord,
  request: unknown,
): void {
  const spanId = (request as { __sentry_xhr_span_id__?: unknown } | null)
    ?.__sentry_xhr_span_id__;
  if (typeof spanId !== 'string') return;
  const span = requestSpans.get(spanId);
  if (!span) return;
  requestSpans.delete(spanId);

  span.updateName(`${record.method} ${record.route}`);
  span.setAttributes({
    'api.route': record.route,
    'api.outcome': record.outcome,
    'api.failure_category': record.failure_category,
    'http.status_class': record.status_class,
    // `undefined` borra el atributo: el SDK guarda ahí la URL con ids y query.
    'url.full': undefined,
    'url.query': undefined,
    'url.fragment': undefined,
  });
}

/**
 * Etiquetas de baja cardinalidad de una petición: método, ruta normalizada, clase de estado y
 * categoría. Nunca ids, correo, cuenta, timestamps ni URL.
 *
 * @param record - Registro de la petición.
 * @returns Las etiquetas para un evento.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * apiRequestTags(record); // { 'api.method': 'GET', 'api.route': '/api/v1/document/:id', … }
 * ```
 */
export function apiRequestTags(
  record: ApiRequestRecord,
): Record<string, string> {
  const tags: Record<string, string> = {
    'api.method': record.method,
    'api.route': record.route,
    'api.outcome': record.outcome,
    'http.status_class': record.status_class,
  };
  if (record.failure_category) {
    tags['api.failure_category'] = record.failure_category;
  }
  return tags;
}

/**
 * Registra una petición terminada: breadcrumb, span del SDK y, si es un fallo que conviene
 * vigilar (`server`, `network`, `timeout`), un evento.
 *
 * - **Breadcrumb** `api.request` con sólo el registro. Sustituye al breadcrumb `xhr` del SDK,
 *   que está apagado porque lleva la URL con query (ver `sentry.client.config.ts`).
 * - **Evento** de nivel `error` (servidor) o `warning` (conexión), agrupado por método + ruta +
 *   categoría: un endpoint que falla es UNA incidencia, no una por llamada. Sin el `AxiosError`:
 *   el mensaje y las etiquetas salen del registro.
 * - `client` y `cancelled` sólo se clasifican: un 401, 403, 404 o 422 es una respuesta esperada
 *   que la pantalla maneja, y una cancelación no es un fallo del servicio.
 *
 * Nunca lanza: la telemetría no puede romper una petición.
 *
 * @param record - Registro de la petición.
 * @param request - El XHR de la petición (`response.request` / `error.request`).
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * reportApiRequest(record, response.request);
 * ```
 */
export function reportApiRequest(
  record: ApiRequestRecord,
  request: unknown,
): void {
  try {
    const category = record.failure_category;
    Sentry.addBreadcrumb({
      type: 'http',
      category: 'api.request',
      level:
        category === undefined
          ? 'info'
          : REPORTED_FAILURES.has(category)
            ? 'error'
            : 'warning',
      data: { ...record },
    });

    annotateRequestSpan(record, request);

    if (category && REPORTED_FAILURES.has(category)) {
      Sentry.captureEvent({
        message: `API ${category}: ${record.method} ${record.route}`,
        level: category === 'server' ? 'error' : 'warning',
        fingerprint: [
          API_EVENT_FINGERPRINT,
          record.method,
          record.route,
          category,
        ],
        tags: apiRequestTags(record),
        contexts: { api_request: { ...record } },
      });
    }
  } catch {
    // La telemetría es pasiva: si falla, la petición sigue su curso.
  }
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
function elapsedSince(
  config: object | undefined,
  now: number = performance.now(),
): number {
  const start = config ? startTimes.get(config) : undefined;
  return start === undefined ? 0 : now - start;
}

/**
 * Registra una respuesta exitosa. Se llama en el interceptor de response.
 *
 * @param response - Respuesta de axios.
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * apiClient.interceptors.response.use((response) => { recordApiResponse(response); return response; });
 * ```
 */
export function recordApiResponse(response: {
  config: { method?: string; url?: string; baseURL?: string };
  status: number;
  request?: unknown;
}): void {
  const record = buildApiRequestRecord({
    method: response.config.method,
    url: response.config.url,
    baseURL: response.config.baseURL,
    status: response.status,
    durationMs: elapsedSince(response.config),
  });
  if (record) reportApiRequest(record, response.request);
}

/**
 * Registra un fallo y lo clasifica. Se llama en el interceptor de error, antes de rechazar.
 *
 * Además recuerda el `AxiosError` para que `filterApiErrorEvent` no lo deje salir como
 * excepción no controlada si nadie lo atrapa.
 *
 * @param error - Lo que rechazó axios.
 * @returns El registro, o `null` si la petición no es interna o el error no es de axios.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * (error) => { recordApiError(error); return Promise.reject(error); }
 * ```
 */
export function recordApiError(error: unknown): ApiRequestRecord | null {
  if (!isAxiosError(error) && !isCancel(error)) return null;
  const config = (
    error as { config?: { method?: string; url?: string; baseURL?: string } }
  ).config;
  const record = buildApiRequestRecord({
    method: config?.method,
    url: config?.url,
    baseURL: config?.baseURL,
    status: isAxiosError(error) ? error.response?.status : undefined,
    durationMs: elapsedSince(config),
    failure: classifyApiFailure(error),
  });
  if (!record) return null;

  errorRecords.set(error as object, record);
  reportApiRequest(record, (error as { request?: unknown }).request);
  return record;
}

/**
 * Filtro de `beforeSend` para los eventos relacionados con la API.
 *
 * - **`AxiosError` ya registrado → se descarta.** La petición ya quedó registrada con sus datos
 *   permitidos (breadcrumb y, si toca, evento propio). Si además nadie atrapa la promesa —un
 *   `mutateAsync` sin `catch`—, el SDK mandaría el `AxiosError` como excepción no controlada: un
 *   404 o un 422 aparecerían como incidencias, y un 500 contaría dos veces.
 * - **Evento propio de API → se limpia.** El SDK le agrega a todo evento la página en la que
 *   ocurrió: `transaction` con el path crudo (ids de documento), `request` con la URL completa y
 *   el user agent, y los breadcrumbs de navegación con su query. Para diagnosticar un endpoint
 *   nada de eso hace falta: se quitan, y de los breadcrumbs sólo quedan los `api.request`.
 *
 * @param event - Evento de error armado por el SDK.
 * @param hint - Pista del SDK; `originalException` es lo que se capturó.
 * @returns `null` si es un fallo de API ya registrado; el evento limpio si es uno propio; si no,
 * el mismo evento.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * beforeSend: (event, hint) => filterApiErrorEvent(event, hint)
 * ```
 */
export function filterApiErrorEvent(
  event: ErrorEvent,
  hint: EventHint | undefined,
): ErrorEvent | null {
  const original = hint?.originalException;
  if (original && typeof original === 'object' && errorRecords.has(original)) {
    return null;
  }

  if (event.fingerprint?.[0] === API_EVENT_FINGERPRINT) {
    delete event.request;
    delete event.transaction;
    delete event.user;
    event.breadcrumbs = event.breadcrumbs?.filter(
      (breadcrumb) => breadcrumb.category === 'api.request',
    );
  }
  return event;
}
