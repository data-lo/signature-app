/**
 * Ruta del visor público de un documento (`app/(public)/public/documents/[id]`): la única vista del
 * proyecto que se puede consultar sin sesión, porque queda fuera del matcher de `middleware.ts`.
 * El enlace que genera la acción "Compartir enlace" apunta aquí y a ningún otro lado.
 */
export function publicDocumentPath(documentId: string): string {
  return `/public/documents/${documentId}`;
}

/**
 * URL absoluta del visor público, lista para copiar al portapapeles.
 *
 * El origen se toma de dónde está corriendo la app (`window.location.origin`) en vez de una
 * variable de entorno: el frontend no publica ninguna base URL propia al cliente (`.env.local`
 * solo define la del API), así que cualquier otra fuente daría un enlace roto en despliegues
 * con dominio distinto al de desarrollo.
 *
 * @param origin origen explícito; por defecto el de la ventana actual. En SSR (sin `window`)
 * devuelve la ruta relativa, que sigue siendo un enlace válido dentro de la misma app.
 */
export function buildPublicDocumentUrl(
  documentId: string,
  origin: string | undefined = typeof window === 'undefined'
    ? undefined
    : window.location.origin,
): string {
  const path = publicDocumentPath(documentId);
  if (!origin) return path;

  return `${origin.replace(/\/+$/, '')}${path}`;
}
