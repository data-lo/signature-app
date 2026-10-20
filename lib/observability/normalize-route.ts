/**
 * Rutas de la app como plantillas seguras para la telemetría (historia "Normalizar rutas
 * dinámicas antes de enviarlas a la telemetría").
 *
 * Una ruta literal (`/dashboard/documents/9fc1a3b2-…`) separa en GlitchTip cada documento en su
 * propio grupo y saca su id. Aquí se convierte en la plantilla de la pantalla
 * (`/dashboard/documents/[documentId]`) con un catálogo explícito y revisable: no se adivinan ids
 * con una expresión regular genérica, y lo que no está en el catálogo no sale tal cual.
 *
 * Es una función pura: no lee `window`, React, Sentry ni estado global.
 */

/** Lo que se reporta cuando la ruta no corresponde a ninguna pantalla del catálogo. */
export const UNMATCHED_ROUTE = '/[unmatched]';

/**
 * Rutas sin segmentos dinámicos: salen igual que llegan.
 *
 * Son las pantallas estáticas de `app/` más las rutas viejas que `next.config.ts` redirige
 * (`/dashboard/documents/to-sign`, …), que también pueden aparecer en una URL. Deben ir aquí
 * para que `/dashboard/documents/create` no se tome por un id de documento.
 */
const STATIC_ROUTES: ReadonlySet<string> = new Set([
  '/',
  '/access-document',
  '/dashboard',
  '/dashboard/directory',
  '/dashboard/documents',
  '/dashboard/documents/create',
  '/dashboard/documents/to-sign',
  '/dashboard/documents/sent',
  '/dashboard/documents/created',
  '/dashboard/documents/completed',
  '/dashboard/organization/create',
  '/dashboard/organization/settings/information',
  '/dashboard/organization/settings/permissions',
  '/dashboard/organization/settings/roles',
  '/dashboard/personal-documents',
  '/dashboard/personal-documents/identity',
  '/dashboard/plans',
  '/dashboard/subscriptions',
  '/dashboard/unauthorized',
  '/error',
  '/forgot-password',
  '/join',
  '/login',
  '/signature-capture',
  '/signup',
  '/signup/verify',
]);

/**
 * Patrones de las rutas dinámicas, del más específico al más general. Un segmento entre
 * corchetes es un parámetro: se sustituye por su nombre. El patrón es un prefijo: los segmentos
 * que siguen se conservan (`/public/documents/<id>/sign` → `/public/documents/[id]/sign`).
 */
const DYNAMIC_ROUTE_PATTERNS: readonly (readonly string[])[] = [
  ['public', 'documents', '[id]', 'signatures', '[collaboratorId]'],
  ['public', 'documents', '[id]'],
  ['dashboard', 'documents', '[documentId]'],
  ['dashboard', 'organizations', '[organizationId]'],
];

/** `scheme://autoridad` al principio de una URL completa. */
const URL_ORIGIN = /^[a-z][a-z\d+.-]*:\/\/[^/]*/i;

/**
 * Deja sólo el path de la entrada: sin query, fragmento ni origen, sin barras repetidas ni la
 * final.
 *
 * @param pathname - Lo que llegó.
 * @returns Los segmentos del path, o `undefined` si la entrada no es un path.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * toSegments('https://app.example.com/login/?next=x#y'); // ['login']
 * ```
 */
function toSegments(pathname: unknown): string[] | undefined {
  if (typeof pathname !== 'string') return undefined;
  const input = pathname.trim().split(/[?#]/, 1)[0];
  const origin = URL_ORIGIN.exec(input);
  const path = origin ? input.slice(origin[0].length) || '/' : input;
  if (!path.startsWith('/')) return undefined;
  return path.split('/').filter(Boolean);
}

/**
 * Aplica el primer patrón dinámico que case como prefijo.
 *
 * @param segments - Segmentos del path.
 * @returns La ruta con los parámetros sustituidos, o `undefined` si ninguno casa.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * matchDynamicRoute(['public', 'documents', 'doc-456', 'sign']); // '/public/documents/[id]/sign'
 * ```
 */
function matchDynamicRoute(segments: readonly string[]): string | undefined {
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (segments.length < pattern.length) continue;
    const matches = pattern.every(
      (part, index) => part.startsWith('[') || part === segments[index],
    );
    if (matches) {
      return `/${[...pattern, ...segments.slice(pattern.length)].join('/')}`;
    }
  }
  return undefined;
}

/**
 * Normaliza un pathname a una plantilla segura para la telemetría.
 *
 * 1. Quita query params, fragmento y, si llega una URL completa, el origen.
 * 2. Una ruta estática del catálogo sale igual.
 * 3. Una ruta dinámica conocida sale con sus ids sustituidos por el nombre del parámetro; el
 *    resto de los segmentos se conserva.
 * 4. Cualquier otra cosa (ruta desconocida, entrada vacía o que no es un path) sale como
 *    `UNMATCHED_ROUTE`, para que un id, un correo o un token en una URL inesperada nunca se
 *    reporte.
 *
 * @param pathname - Pathname (p. ej. el de `usePathname()`).
 * @returns La ruta normalizada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeRoute('/dashboard/documents/abc-123'); // '/dashboard/documents/[documentId]'
 * normalizeRoute('/public/documents/doc-456/sign?token=secret#signature'); // '/public/documents/[id]/sign'
 * normalizeRoute('/dashboard/documents'); // '/dashboard/documents'
 * ```
 */
export function normalizeRoute(pathname: string): string {
  const segments = toSegments(pathname);
  if (!segments) return UNMATCHED_ROUTE;

  const path = `/${segments.join('/')}`;
  if (STATIC_ROUTES.has(path)) return path;

  return matchDynamicRoute(segments) ?? UNMATCHED_ROUTE;
}
