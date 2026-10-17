import * as Sentry from '@sentry/nextjs';
import type { Event, Span } from '@sentry/nextjs';
import { isAxiosError } from 'axios';

/**
 * Métricas de la carga de documentos (historia "Medir rendimiento y fallos de carga de
 * documentos").
 *
 * **Una señal por carga terminada**: una transacción de GlitchTip que va desde que se dispara
 * `POST /api/v1/documents/signatures` hasta que responde o falla. Incluye la subida del archivo,
 * el proxy `/api/*` de Next y la respuesta del backend (axios resuelve con la respuesta completa).
 * No hay eventos por avance de la subida: `onUploadProgress` sigue alimentando sólo la barra.
 *
 * **Cómo se ve en GlitchTip** (Performance agrupa por nombre y `op`):
 * - nombre `document_upload:<rango de tamaño>` → un grupo por rango, con su p95 de duración;
 * - `op` `document.upload.success` o `document.upload.<categoría del fallo>` → dentro de cada
 *   rango, el conteo de éxitos y de cada tipo de fallo: la tasa de éxito y qué falla.
 *
 * **Qué sale**: sólo `UploadSignal`. Nunca el nombre, contenido, hash, MIME ni tamaño exacto del
 * archivo; ni ids, correos o la configuración de `documentData`/`collaborators`.
 */

/** Operación que se mide; es la `operation` de cada señal. */
export const UPLOAD_OPERATION = 'document_upload';

/** Prefijo del `op` de las transacciones de carga. */
export const UPLOAD_OP_PREFIX = 'document.upload';

/** Ruta del endpoint de carga, tal como la llama `createDocumentSignaturesRequest`. */
export const DOCUMENT_UPLOAD_PATH = '/api/v1/documents/signatures';

export type FileSizeBucket =
  | 'less_than_1_mb'
  | '1_to_5_mb'
  | '5_to_10_mb'
  | '10_to_20_mb'
  | 'greater_than_20_mb';

export type UploadOutcome = 'success' | 'failure';

export type UploadFailureCategory =
  'timeout' | 'network' | 'validation' | 'server';

/**
 * Tipo de firma del documento. Desde la historia "Selección de tipo de firma al crear documentos"
 * hay uno solo por documento, así que el `mixed` de las firmas distintas por firmante ya no es
 * alcanzable; la biométrica, en cambio, sí existe.
 */
export type SignatureMode = 'simple' | 'advanced' | 'biometric';

/** Lo único que se registra de una carga. */
export interface UploadSignal {
  operation: typeof UPLOAD_OPERATION;
  outcome: UploadOutcome;
  duration_ms: number;
  file_size_bucket: FileSizeBucket;
  /** Sólo en los fallos. */
  failure_category?: UploadFailureCategory;
  has_collaborators: boolean;
  signature_mode: SignatureMode;
}

/** Un MB con la misma base que el límite de la pantalla (`DOCUMENT_FILE_SIZE_BASE`). */
const MB = 1024 * 1024;

/**
 * Rango de tamaño de un archivo. Los cortes son `[0, 1)`, `[1, 5)`, `[5, 10)`, `[10, 20]` y más
 * de 20 MB: 20 MB exactos es el máximo permitido, así que cae en el rango de los válidos.
 *
 * @param bytes - Tamaño del archivo (`file.size`). Nunca se registra: sólo su rango.
 * @returns El rango.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * fileSizeBucket(12 * 1024 * 1024); // '10_to_20_mb'
 * ```
 */
export function fileSizeBucket(bytes: number): FileSizeBucket {
  if (bytes < 1 * MB) return 'less_than_1_mb';
  if (bytes < 5 * MB) return '1_to_5_mb';
  if (bytes < 10 * MB) return '5_to_10_mb';
  if (bytes <= 20 * MB) return '10_to_20_mb';
  return 'greater_than_20_mb';
}

/**
 * Tipo de firma de la señal a partir del del documento.
 *
 * @param signatureType - `documentData.signatureType`.
 * @returns `'simple'`, `'advanced'` (e.firma) o `'biometric'`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toSignatureMode('ADVANCED'); // 'advanced'
 * ```
 */
export function toSignatureMode(
  signatureType: 'SIMPLE' | 'ADVANCED' | 'BIOMETRIC',
): SignatureMode {
  if (signatureType === 'ADVANCED') return 'advanced';
  if (signatureType === 'BIOMETRIC') return 'biometric';
  return 'simple';
}

/** Estados con los que un proxy o el servidor dicen que se agotó el tiempo. */
const TIMEOUT_STATUSES = new Set([408, 504]);

/**
 * Clasifica el fallo de una carga.
 *
 * - `timeout`: el `timeout` de axios (`ECONNABORTED`, `ETIMEDOUT`) o un 408/504 del proxy o del
 *   servidor.
 * - `validation`: cualquier otro 4xx. El backend rechazó lo enviado (PDF dañado, 413 por tamaño,
 *   datos inválidos, sin permiso o sin créditos); reintentar igual no lo arregla.
 * - `server`: cualquier otro 5xx.
 * - `network`: no hubo respuesta (sin conexión, corte a mitad de la subida, el navegador abortó).
 *
 * El navegador comparte `ECONNABORTED` entre el timeout y el aborto ("Request aborted", p. ej. al
 * cerrar la pestaña); el aborto no es un timeout y cuenta como `network`.
 *
 * @param error - Lo que rechazó la carga.
 * @returns La categoría.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * classifyUploadFailure(new AxiosError('timeout of 0ms exceeded', 'ECONNABORTED')); // 'timeout'
 * ```
 */
export function classifyUploadFailure(error: unknown): UploadFailureCategory {
  if (!isAxiosError(error)) return 'network';

  if (error.code === 'ETIMEDOUT') return 'timeout';
  if (error.code === 'ECONNABORTED') {
    return /aborted/i.test(error.message) ? 'network' : 'timeout';
  }

  const status = error.response?.status;
  if (status === undefined) return 'network';
  if (TIMEOUT_STATUSES.has(status)) return 'timeout';
  if (status >= 400 && status <= 499) return 'validation';
  return 'server';
}

/** Contexto de la carga: sólo lo que se convierte en dimensiones de la señal. */
export interface UploadContext {
  /** `file.size`; sólo se usa para el rango. */
  fileSizeBytes: number;
  hasCollaborators: boolean;
  signatureMode: SignatureMode;
}

/**
 * Arma la señal de una carga terminada.
 *
 * @param context - Contexto de la carga.
 * @param durationMs - Duración medida.
 * @param failure - Categoría del fallo; ausente en un éxito.
 * @returns La señal.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * buildUploadSignal({ fileSizeBytes: 12e6, hasCollaborators: true, signatureMode: 'simple' }, 12400);
 * // { operation: 'document_upload', outcome: 'success', duration_ms: 12400, file_size_bucket: '10_to_20_mb', … }
 * ```
 */
export function buildUploadSignal(
  context: UploadContext,
  durationMs: number,
  failure?: UploadFailureCategory,
): UploadSignal {
  const signal: UploadSignal = {
    operation: UPLOAD_OPERATION,
    outcome: failure ? 'failure' : 'success',
    duration_ms: Math.max(0, Math.round(durationMs)),
    file_size_bucket: fileSizeBucket(context.fileSizeBytes),
    has_collaborators: context.hasCollaborators,
    signature_mode: context.signatureMode,
  };
  if (failure) signal.failure_category = failure;
  return signal;
}

/**
 * Estado de la transacción por categoría de fallo. El SDK sólo acepta los estados estándar de
 * Sentry (cualquier otro texto lo convierte en `internal_error`), así que se usa el equivalente.
 */
const FAILURE_SPAN_STATUS: Record<UploadFailureCategory, string> = {
  timeout: 'deadline_exceeded',
  validation: 'invalid_argument',
  network: 'unavailable',
  server: 'internal_error',
};

/** Prefijo de los atributos de la señal en la transacción (`upload.outcome`, …). */
const SIGNAL_ATTRIBUTE_PREFIX = 'upload.';

/**
 * Etiquetas de la señal a partir de los atributos de la transacción: todas de baja cardinalidad
 * (sin `duration_ms`, que ya es la duración de la transacción).
 *
 * @param traceData - `contexts.trace.data` de la transacción de carga.
 * @returns Las etiquetas, con los booleanos como texto.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * uploadSignalTags({ 'upload.outcome': 'success', 'upload.has_collaborators': true });
 * // { operation: 'document_upload', outcome: 'success', has_collaborators: 'true' }
 * ```
 */
export function uploadSignalTags(
  traceData: Record<string, unknown> | undefined,
): Record<string, string> {
  const tags: Record<string, string> = { operation: UPLOAD_OPERATION };
  for (const [key, value] of Object.entries(traceData ?? {})) {
    if (!key.startsWith(SIGNAL_ATTRIBUTE_PREFIX) || value === undefined)
      continue;
    const name = key.slice(SIGNAL_ATTRIBUTE_PREFIX.length);
    if (name !== 'duration_ms') tags[name] = String(value);
  }
  return tags;
}

/**
 * Cierra la transacción de la carga con su señal: `op` según el resultado, etiquetas y estado.
 *
 * @param span - Transacción abierta por `measureDocumentUpload`.
 * @param signal - Señal de la carga.
 * @param endTime - Momento de cierre, en segundos (reloj del SDK).
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * finishUploadSpan(span, signal, Date.now() / 1000);
 * ```
 */
function finishUploadSpan(
  span: Span,
  signal: UploadSignal,
  endTime: number,
): void {
  span.setAttributes({
    'sentry.op': `${UPLOAD_OP_PREFIX}.${signal.failure_category ?? 'success'}`,
    ...Object.fromEntries(
      Object.entries(signal)
        .filter(([key]) => key !== 'operation')
        .map(([key, value]) => [`${SIGNAL_ATTRIBUTE_PREFIX}${key}`, value]),
    ),
  });
  span.setStatus(
    signal.failure_category
      ? { code: 2, message: FAILURE_SPAN_STATUS[signal.failure_category] }
      : { code: 1 },
  );
  span.end(endTime);
}

/**
 * Mide una carga de documento y emite su única señal al terminar, sin alterar la carga: devuelve
 * lo mismo que `upload` y relanza el mismo error. Si registrar falla, la carga sigue igual.
 *
 * **Vínculo sin duplicado**: si hay una transacción activa (la carga de página o una navegación),
 * la de la carga cuelga de ella, en la misma traza. Y para que la misma petición no se mida dos
 * veces, el span `http.client` automático del SDK se apaga para este endpoint
 * (`shouldCreateSpanForUploadRequest` en `sentry.client.config.ts`).
 *
 * @param context - Contexto de la carga (tamaño, colaboradores, tipo de firma).
 * @param upload - La petición de carga.
 * @param clock - Reloj en ms; por omisión `performance.now()`.
 * @returns Lo que resuelva `upload`.
 *
 * @throws Lo mismo que `upload`, sin cambios.
 *
 * @example
 * ```ts
 * const { data } = await measureDocumentUpload(
 *   { fileSizeBytes: file.size, hasCollaborators: true, signatureMode: 'simple' },
 *   () => apiClient.post(DOCUMENT_UPLOAD_PATH, formData, config),
 * );
 * ```
 */
export async function measureDocumentUpload<T>(
  context: UploadContext,
  upload: () => Promise<T>,
  clock: () => number = () => performance.now(),
): Promise<T> {
  let span: Span | undefined;
  try {
    const bucket = fileSizeBucket(context.fileSizeBytes);
    span = Sentry.startInactiveSpan({
      name: `${UPLOAD_OPERATION}:${bucket}`,
      op: UPLOAD_OP_PREFIX,
      forceTransaction: true,
      // Cuelga de la transacción activa si la hay (misma traza); si no, empieza una propia.
      parentSpan: Sentry.getActiveSpan() ?? null,
    });
  } catch {
    span = undefined;
  }

  const start = clock();
  const finish = (failure?: UploadFailureCategory) => {
    if (!span) return;
    try {
      finishUploadSpan(
        span,
        buildUploadSignal(context, clock() - start, failure),
        Date.now() / 1000,
      );
    } catch {
      // La telemetría es pasiva: si falla, la carga sigue su curso.
    }
  };

  try {
    const result = await upload();
    finish();
    return result;
  } catch (error) {
    finish(classifyUploadFailure(error));
    throw error;
  }
}

/**
 * `shouldCreateSpanForRequest` de `browserTracingIntegration`: no crea el span `http.client` de la
 * carga de documentos, que ya mide `measureDocumentUpload` como transacción propia.
 *
 * @param url - URL de la petición.
 * @returns `false` para el endpoint de carga; `true` para el resto.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * Sentry.browserTracingIntegration({ shouldCreateSpanForRequest: shouldCreateSpanForUploadRequest });
 * ```
 */
export function shouldCreateSpanForUploadRequest(url: string): boolean {
  return !url.split(/[?#]/, 1)[0].endsWith(DOCUMENT_UPLOAD_PATH);
}

/**
 * `tracesSampler` del navegador: las cargas de documentos se muestrean siempre; todo lo demás,
 * igual que sin sampler (hereda la decisión del padre o usa `tracesSampleRate`).
 *
 * Las cargas son pocas y cada fallo importa: al 10 % de las trazas se perderían nueve de cada
 * diez fallos y la tasa de éxito saldría de un puñado de muestras.
 *
 * @param fallbackRate - El `tracesSampleRate` de las demás transacciones.
 * @returns El sampler para `Sentry.init`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * Sentry.init({ tracesSampler: uploadAwareTracesSampler(options.tracesSampleRate) });
 * ```
 */
export function uploadAwareTracesSampler(fallbackRate: number) {
  return (context: {
    attributes?: Record<string, unknown>;
    inheritOrSampleWith: (fallbackSampleRate: number) => number;
  }): number => {
    const op = context.attributes?.['sentry.op'];
    if (typeof op === 'string' && op.startsWith(UPLOAD_OP_PREFIX)) return 1;
    return context.inheritOrSampleWith(fallbackRate);
  };
}

/**
 * Indica si un evento es la transacción de una carga de documento.
 *
 * @param event - Evento armado por el SDK.
 * @returns `true` si su `op` empieza por `UPLOAD_OP_PREFIX`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isUploadTransaction({ type: 'transaction', contexts: { trace: { op: 'document.upload.success' } } }); // true
 * ```
 */
export function isUploadTransaction(event: Event): boolean {
  return Boolean(event.contexts?.trace?.op?.startsWith(UPLOAD_OP_PREFIX));
}

/**
 * Limpia la transacción de una carga antes de enviarla. Va en `beforeSendTransaction`.
 *
 * El SDK le agrega a toda transacción la página (`request`, con el user agent), los breadcrumbs
 * —que pueden traer logs de consola con respuestas de la API: ids del documento creado, correos
 * de firmantes— y contextos del dispositivo. Para medir la carga no hace falta nada de eso: queda
 * la señal y la traza. A las demás transacciones no les hace nada.
 *
 * Muta el evento (es lo que espera `beforeSendTransaction`) y lo devuelve.
 *
 * @param event - Transacción armada por el SDK.
 * @returns La misma transacción; limpia si es de carga.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * beforeSendTransaction: (event) => scrubUploadTransaction(event)
 * ```
 */
export function scrubUploadTransaction<T extends Event>(event: T): T {
  if (!isUploadTransaction(event)) return event;

  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  event.contexts = event.contexts?.trace
    ? { trace: event.contexts.trace }
    : undefined;
  event.tags = uploadSignalTags(event.contexts?.trace?.data);
  // Si algún día la petición vuelve a tener span propio, que no lleve la URL ni tamaños exactos.
  for (const span of event.spans ?? []) {
    const data = span.data;
    if (!data) continue;
    for (const key of Object.keys(data)) {
      if (/^url\.|size|length/i.test(key)) delete data[key];
    }
  }
  return event;
}
