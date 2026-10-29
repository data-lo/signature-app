import InvitationSigningEntry from '@/app/(public)/_signing/invitation/InvitationSigningEntry';
import { signingPageMetadata } from '@/app/(public)/_signing/invitation/signing-page-metadata';

export const metadata = signingPageMetadata;

interface LaunchSigningPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Firma desde el portal del tercero que creó el documento (`/sign/launch/:token`). El tercero pidió
 * esta URL para un firmante con su API key; el token vive minutos y se usa una vez. Abrirla no
 * autoriza nada: lleva al mismo código del correo de la invitación y a la misma sesión pública que
 * el enlace del correo.
 *
 * @param props.params - `token` de lanzamiento (`sla_…`).
 * @returns La pantalla de firma de la invitación.
 *
 * @example
 * ```tsx
 * // /sign/launch/sla_q3Vb…
 * ```
 */
export default async function LaunchSigningPage({
  params,
}: LaunchSigningPageProps) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4 sm:p-8">
      <InvitationSigningEntry source={{ kind: 'THIRD_PARTY_PORTAL', token }} />
    </main>
  );
}
