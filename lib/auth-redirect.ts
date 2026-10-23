/**
 * A dónde va el usuario al autenticarse y cómo se recuerda la ruta que pidió antes de iniciar
 * sesión.
 *
 * Lo importan el middleware (edge runtime) y el cliente, así que no depende de nada del navegador
 * ni de React: sólo strings y `URL`.
 */

/**
 * Destino por defecto tras iniciar sesión: el dashboard de documentos (la bandeja con búsqueda y
 * filtros). Antes era `/dashboard/documents/create`; crear un documento es una acción de esa
 * bandeja, no la pantalla de entrada.
 */
export const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard/documents';

/** Parámetro de `/login` con la ruta protegida que el usuario pidió sin sesión. */
export const RETURN_TO_PARAM = 'returnTo';

/** Rutas de autenticación: nunca son un destino válido de regreso (provocarían un bucle). */
export const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/signup/verify',
];

/** Origen ficticio para resolver rutas relativas sin depender de `window`. */
const PARSE_BASE = 'http://internal.invalid';

/** Tope de longitud: una ruta legítima nunca se acerca; evita arrastrar basura en la URL. */
const MAX_RETURN_TO_LENGTH = 2048;

/**
 * Valida la ruta de regreso que llega en `?returnTo=` y la devuelve normalizada.
 *
 * Sólo acepta rutas internas de la propia app: empiezan con una sola `/`, no traen esquema ni
 * host (`//evil.com`, `/\evil.com`, `https://…`) y no son una pantalla de autenticación. Así el
 * parámetro no sirve para mandar al usuario a otro sitio (redirección abierta) ni para crear un
 * bucle de vuelta al login.
 *
 * @param value - Valor crudo del parámetro, si vino.
 * @returns La ruta con su query y hash (p. ej. `/dashboard/documents/doc-1?tab=firmas`), o `null`
 *   si no vino o no es segura.
 *
 * @example
 * ```ts
 * sanitizeReturnTo('/dashboard/documents/doc-1'); // '/dashboard/documents/doc-1'
 * sanitizeReturnTo('//evil.com');                 // null
 * sanitizeReturnTo('/login');                     // null
 * ```
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value || value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('\\')) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, PARSE_BASE);
  } catch {
    return null;
  }
  if (parsed.origin !== PARSE_BASE) return null;

  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  if (AUTH_ROUTES.includes(path)) return null;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Arma la URL de `/login` recordando la ruta a la que hay que volver.
 *
 * Si la ruta no es segura (o es la raíz, cuyo destino ya es el por defecto) no se agrega nada.
 *
 * @param returnTo - Ruta pedida (path + query), si la hay.
 * @returns `/login` o `/login?returnTo=…`.
 *
 * @example
 * ```ts
 * buildLoginPath('/dashboard/documents/doc-1'); // '/login?returnTo=%2Fdashboard%2Fdocuments%2Fdoc-1'
 * buildLoginPath();                             // '/login'
 * ```
 */
export function buildLoginPath(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe || safe === '/') return '/login';
  return `/login?${new URLSearchParams({ [RETURN_TO_PARAM]: safe }).toString()}`;
}

/**
 * Destino tras autenticarse, a partir de la query de `/login`: la ruta guardada si es segura, o el
 * dashboard de documentos.
 *
 * @param search - Query de la URL actual (`window.location.search` o `request.nextUrl.search`).
 * @returns La ruta de destino; nunca vacía.
 *
 * @example
 * ```ts
 * resolvePostLoginDestination('?returnTo=%2Fdashboard%2Fplans'); // '/dashboard/plans'
 * resolvePostLoginDestination('');                               // '/dashboard/documents'
 * ```
 */
export function resolvePostLoginDestination(search: string): string {
  const returnTo = new URLSearchParams(search).get(RETURN_TO_PARAM);
  return sanitizeReturnTo(returnTo) ?? DEFAULT_AUTHENTICATED_ROUTE;
}
