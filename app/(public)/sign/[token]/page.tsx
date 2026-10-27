import type { Metadata } from 'next';
import InvitationSigningEntry from './_components/InvitationSigningEntry';

/**
 * Sin `Referer`: el token va en la ruta, y sin esto el navegador lo mandaría a cada recurso que
 * cargue la página (el PDF prefirmado, Didit). Tampoco se indexa.
 */
export const metadata: Metadata = {
  title: 'Firma de documento',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

interface InvitationSigningPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Pantalla pública de firma por invitación individual (`/sign/:token`). Es la misma experiencia que
 * `/public/documents/:id/sign` —`PublicSigningLayout` y los flujos por tipo de firma—, pero el
 * contexto sale del token: la URL no lleva el id del documento ni del colaborador. No requiere
 * sesión (el middleware la deja pasar, ver `PUBLIC_ROUTE_PREFIXES`).
 *
 * @param props.params - `token` de la invitación.
 * @returns La pantalla de firma de la invitación.
 *
 * @example
 * ```tsx
 * // /sign/q3Vb…
 * ```
 */
export default async function InvitationSigningPage({
  params,
}: InvitationSigningPageProps) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4 sm:p-8">
      <InvitationSigningEntry token={token} />
    </main>
  );
}
