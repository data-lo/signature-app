import type { Metadata } from 'next';

/**
 * Metadatos de las páginas públicas de firma (`/sign/:token`, `/sign/launch/:token`,
 * `/sign/session`).
 *
 * Sin `Referer`: el token va en la ruta, y sin esto el navegador lo mandaría a cada recurso que
 * cargue la página (el PDF prefirmado, Didit). Tampoco se indexan.
 */
export const signingPageMetadata: Metadata = {
  title: 'Firma de documento',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
