/**
 * Rutas de la app (App Router) con sus segmentos dinámicos entre corchetes, sin grupos de ruta
 * (`(public)`). Es la lista contra la que se normaliza cualquier `pathname` antes de mandarlo a la
 * telemetría: un id de documento, de organización o de colaborador nunca sale tal cual.
 *
 * Debe coincidir con los `page.tsx` de `app/`: `normalize-route.spec.ts` recorre la carpeta y
 * falla si aparece una página que no está aquí.
 */
export const APP_ROUTE_TEMPLATES: readonly string[] = [
  '/',
  '/access-document',
  '/dashboard',
  '/dashboard/directory',
  '/dashboard/documents',
  '/dashboard/documents/[documentId]',
  '/dashboard/documents/create',
  '/dashboard/organization/create',
  '/dashboard/organization/settings/information',
  '/dashboard/organization/settings/permissions',
  '/dashboard/organization/settings/roles',
  '/dashboard/organizations/[organizationId]/members',
  '/dashboard/personal-documents',
  '/dashboard/personal-documents/identity',
  '/dashboard/plans',
  '/dashboard/subscriptions',
  '/dashboard/unauthorized',
  '/error',
  '/forgot-password',
  '/join',
  '/login',
  '/public/documents/[id]',
  '/public/documents/[id]/biometric-signature',
  '/public/documents/[id]/signatures/[collaboratorId]',
  '/signature-capture',
  '/signup',
  '/signup/verify',
];

/** Lo que sustituye a un segmento que no corresponde a ninguna ruta conocida. */
export const UNKNOWN_SEGMENT = '[segment]';

const isDynamicSegment = (segment: string) =>
  segment.startsWith('[') && segment.endsWith(']');

const splitSegments = (path: string) => path.split('/').filter(Boolean);

const TEMPLATE_SEGMENTS = APP_ROUTE_TEMPLATES.map(splitSegments);

/** Segmentos fijos de todas las rutas: los únicos que pueden salir tal cual en una ruta desconocida. */
const STATIC_SEGMENTS = new Set(
  TEMPLATE_SEGMENTS.flat().filter((segment) => !isDynamicSegment(segment)),
);

/**
 * Convierte un `pathname` real en la ruta de la app que lo atiende, sin ids ni datos del usuario.
 *
 * Entre las rutas que encajan gana la que tiene más segmentos fijos, como en el App Router:
 * `/dashboard/documents/create` es la página de alta, no un documento con id `create`. Si ninguna
 * encaja (un 404, un enlace viejo), cada segmento que no sea un nombre fijo conocido se sustituye
 * por `UNKNOWN_SEGMENT`: así un token o un id en una ruta inexistente tampoco llega a la telemetría.
 *
 * Es idempotente: normalizar una ruta ya normalizada la deja igual.
 *
 * @param pathname - Ruta tal como la ve el navegador. Si trae query o fragmento, se descartan.
 * @returns La ruta normalizada, p. ej. `/dashboard/documents/[documentId]`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * normalizeRoute('/dashboard/documents/6f1c…?view=completed'); // '/dashboard/documents/[documentId]'
 * normalizeRoute('/dashboard/documents/create'); // '/dashboard/documents/create'
 * normalizeRoute('/no-existe/abc123'); // '/[segment]/[segment]'
 * ```
 */
export function normalizeRoute(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0];
  const segments = splitSegments(path);

  let best: string[] | undefined;
  let bestStaticCount = -1;
  for (const template of TEMPLATE_SEGMENTS) {
    if (template.length !== segments.length) continue;
    let staticCount = 0;
    const matches = template.every((segment, index) => {
      if (isDynamicSegment(segment)) return true;
      staticCount += 1;
      return segment === segments[index];
    });
    if (matches && staticCount > bestStaticCount) {
      best = template;
      bestStaticCount = staticCount;
    }
  }

  const normalized =
    best ??
    segments.map((segment) =>
      STATIC_SEGMENTS.has(segment) ? segment : UNKNOWN_SEGMENT,
    );
  return `/${normalized.join('/')}`;
}
