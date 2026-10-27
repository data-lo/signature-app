import type { Breadcrumb, Event } from '@sentry/nextjs';

/**
 * Redacción de datos sensibles en lo que sale hacia GlitchTip (historia "Eliminar logs HTTP
 * sensibles del navegador").
 *
 * Es la **segunda barrera**. La primera es no registrar esos datos (ver `./safe-log.ts`): los
 * `console.*` de la app ya no reciben objetos de error ni cuerpos. Esto atrapa lo que se escape
 * igual —un `console.error(error)` nuevo, un mensaje de backend copiado a un `Error`, una URL con
 * token— antes de que el SDK lo envíe.
 */

/** Lo que sustituye a un valor redactado. */
export const REDACTED = '[redactado]';

/**
 * Patrones de datos que nunca deben salir en texto libre, con su sustituto. El orden importa: el
 * JWT va antes que los números largos, y el RFC antes que la CURP no, porque no se solapan.
 */
const SENSITIVE_TEXT_PATTERNS: readonly [RegExp, string][] = [
  // Encabezado de autorización con su token.
  [/\bBearer\s+[\w.~+/=-]+/gi, `Bearer ${REDACTED}`],
  // JWT (tres segmentos base64url, el primero siempre empieza por `eyJ`).
  [/\beyJ[\w-]*\.[\w-]+\.[\w-]*/g, '[jwt]'],
  // Correos.
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[correo]'],
  // CURP: 4 letras, fecha, sexo, entidad, consonantes, homoclave y dígito.
  [/\b[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d\b/gi, '[curp]'],
  // RFC de persona física (13) o moral (12).
  [/\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b/gi, '[rfc]'],
  // Token de invitación de firma en la ruta: `/sign/<token>` y `/public/signing-sessions/<token>`.
  [/(\/sign(?:ing-sessions)?\/)[\w-]+/g, `$1${REDACTED}`],
  // Valores de parámetros de query: tokens de invitación, firmas de URL prefirmadas, OTP…
  [/([?&][\w.%-]+=)[^&\s#"']*/g, `$1${REDACTED}`],
  // OTP, teléfonos, folios: 6 dígitos o más seguidos.
  [/\b\d{6,}\b/g, '[número]'],
];

/**
 * Nombres de campo cuyo valor nunca se envía, sea lo que sea: credenciales, documentos de
 * identidad, cuerpos y archivos. Se comparan sin mayúsculas ni guiones.
 */
const SENSITIVE_KEY =
  /^(authorization|proxyauthorization|cookie|setcookie|token|accesstoken|refreshtoken|jwt|otp|code|password|newpassword|currentpassword|secret|rfc|curp|email|secondaryemail|phone|phonenumber|data|body|responsebody|requestbody|response|request|config|headers|file|files|pdf|certificate|signature|signatureimage|privatekey|arguments)$/;

/** Profundidad máxima al recorrer objetos: más allá se descarta el resto. */
const MAX_DEPTH = 4;

/**
 * Redacta los datos sensibles de un texto: tokens `Bearer`, JWT, correos, CURP, RFC, valores de
 * query params y secuencias largas de dígitos (OTP, teléfonos).
 *
 * @param text - Texto libre (mensaje de log, de error, URL).
 * @returns El texto con cada dato sustituido por su marcador.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * redactSensitiveText('Bearer eyJhbGci.eyJzdWIi.abc para ana@example.com');
 * // 'Bearer [redactado] para [correo]'
 * ```
 */
export function redactSensitiveText(text: string): string {
  return SENSITIVE_TEXT_PATTERNS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text,
  );
}

/**
 * Indica si el valor de un campo no debe enviarse nunca, por su nombre.
 *
 * @param key - Nombre del campo.
 * @returns `true` para credenciales, documentos de identidad, cuerpos y archivos.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * isSensitiveKey('Authorization'); // true
 * isSensitiveKey('status'); // false
 * ```
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.toLowerCase().replace(/[-_\s]/g, ''));
}

/**
 * Copia un valor sin sus datos sensibles: los campos sensibles (`isSensitiveKey`) se sustituyen
 * por `REDACTED`, los textos pasan por `redactSensitiveText` y lo que esté más hondo que
 * `MAX_DEPTH` se descarta. Un `Error` se reduce a su nombre: sus propiedades propias pueden ser la
 * config de axios, con el `Authorization` y el cuerpo de la petición.
 *
 * @param value - Lo que se quiere enviar.
 * @param depth - Profundidad actual (uso interno).
 * @returns Una copia segura; nunca el mismo objeto.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * redactValue({ status: 500, data: { email: 'a@b.mx' }, url: '/join?token=x' });
 * // { status: 500, data: '[redactado]', url: '/join?token=[redactado]' }
 * ```
 */
export function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactSensitiveText(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Error) return { name: value.name };
  if (depth >= MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactValue(item, depth + 1),
    ]),
  );
}

/**
 * Limpia un breadcrumb antes de guardarlo. Va en `beforeBreadcrumb` y, como segunda pasada, en
 * `beforeSend` sobre los breadcrumbs del evento.
 *
 * - **Consola**: se descartan los argumentos (`data.arguments`). El SDK los serializa enteros, y
 *   de un `Error` copia también sus propiedades propias: con un `AxiosError` eso es la config
 *   (`Authorization`, el cuerpo enviado) y la respuesta (el cuerpo recibido). Queda el mensaje,
 *   redactado.
 * - **Cualquier otro** (navegación, fetch, xhr, propios): el mensaje y los datos pasan por la
 *   redacción, que también quita los valores de los query params de sus URLs.
 *
 * Muta el breadcrumb (es lo que espera el SDK) y lo devuelve.
 *
 * @param breadcrumb - Breadcrumb armado por el SDK o por la app.
 * @returns El mismo breadcrumb, limpio.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * scrubBreadcrumb({ category: 'console', message: 'falló ana@b.mx', data: { arguments: [error] } });
 * // { category: 'console', message: 'falló [correo]', data: {} }
 * ```
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.message) {
    breadcrumb.message = redactSensitiveText(breadcrumb.message);
  }
  if (breadcrumb.data) {
    if (breadcrumb.category === 'console') {
      delete breadcrumb.data.arguments;
    }
    breadcrumb.data = redactValue(breadcrumb.data) as Breadcrumb['data'];
  }
  return breadcrumb;
}

/**
 * Segunda barrera sobre un evento ya armado: redacta los mensajes de error y de evento, los
 * breadcrumbs y `extra`.
 *
 * Los mensajes de las excepciones importan porque a veces se copia en un `Error` lo que dijo el
 * backend ("El correo ana@… ya está registrado"). El tipo y la pila no se tocan: sin ellos la
 * incidencia no se puede agrupar ni depurar.
 *
 * Muta el evento (es lo que espera `beforeSend`) y lo devuelve.
 *
 * @param event - Evento de error armado por el SDK.
 * @returns El mismo evento, redactado.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * redactEvent({ message: 'OTP 123456 para ana@b.mx' }); // { message: 'OTP [número] para [correo]' }
 * ```
 */
export function redactEvent<T extends Event>(event: T): T {
  if (event.message) event.message = redactSensitiveText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactSensitiveText(exception.value);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }
  if (event.extra) {
    event.extra = redactValue(event.extra) as T['extra'];
  }
  return event;
}
