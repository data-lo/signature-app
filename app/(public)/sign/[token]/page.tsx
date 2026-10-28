import InvitationSigningEntry from '@/app/(public)/_signing/invitation/InvitationSigningEntry';
import { signingPageMetadata } from '@/app/(public)/_signing/invitation/signing-page-metadata';

export const metadata = signingPageMetadata;

interface InvitationSigningPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Firma por invitación individual desde el enlace del correo (`/sign/:token`). Canjea el token,
 * pide el código del correo de la invitación y abre la sesión pública de firma, la misma que la del
 * portal del tercero (`/sign/launch/:token`). No requiere sesión de la plataforma (el middleware
 * deja pasar `/sign/`).
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
      <InvitationSigningEntry source={{ kind: 'EMAIL', token }} />
    </main>
  );
}
