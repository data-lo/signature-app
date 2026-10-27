'use client';

import PublicAdvancedSigningFlow from '@/app/(public)/public/documents/[id]/sign/_components/PublicAdvancedSigningFlow';
import AccountSigningAccess from '../AccountSigningAccess';
import { guestInvitationOf, type SignatureFlowProps } from './types';

/**
 * Firma Electrónica Avanzada (`ADVANCED`, `FIEL` en el backend). Sin cuenta vinculada reutiliza
 * `PublicAdvancedSigningFlow`: código al correo, visor y firma con `.cer` + `.key` + contraseña,
 * sin login. Con cuenta vinculada el backend no admite la firma de invitado, y se continúa desde la
 * cuenta.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El flujo de invitado o el acceso por cuenta.
 *
 * @example
 * ```tsx
 * <AdvancedSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function AdvancedSignatureFlow({
  session,
  onSuccess,
  onError,
}: SignatureFlowProps) {
  const invitation = guestInvitationOf(session);

  if (!session.signer.guestSigningAllowed || !invitation) {
    return (
      <AccountSigningAccess
        session={session}
        description="Esta invitación está vinculada a tu cuenta. Inicia sesión para firmar con tu e.firma desde tu panel."
      />
    );
  }

  return (
    <PublicAdvancedSigningFlow
      documentId={session.document.id}
      invitation={invitation}
      maskedEmail={session.signer.maskedEmail}
      onSigned={onSuccess}
      onError={(cause) => onError({ cause })}
    />
  );
}
