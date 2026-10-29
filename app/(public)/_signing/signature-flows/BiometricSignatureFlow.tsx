'use client';

import PublicBiometricSigningFlow from '@/app/(public)/public/documents/[id]/biometric-signature/_components/PublicBiometricSigningFlow';
import AccountSigningAccess from '../AccountSigningAccess';
import SigningSessionStatusView from '../SigningSessionStatusView';
import { guestInvitationOf, type SignatureFlowProps } from './types';

/**
 * Firma con biometría (`BIOMETRIC`). Sin cuenta vinculada reutiliza `PublicBiometricSigningFlow`:
 * código al correo, consentimiento y ubicación, verificación de identidad en Didit y estado de la
 * firma. De regreso de Didit (sin colaborador en la sesión) el flujo retoma con el acceso de la
 * pestaña. Con cuenta vinculada se continúa desde la cuenta.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El flujo de invitado o el acceso por cuenta.
 *
 * @example
 * ```tsx
 * <BiometricSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function BiometricSignatureFlow({
  session,
  onSuccess,
  onError,
}: SignatureFlowProps) {
  if (!session.signer.guestSigningAllowed) {
    return (
      <AccountSigningAccess
        session={session}
        description="Esta invitación está vinculada a tu cuenta. Inicia sesión para verificar tu identidad y firmar desde tu panel."
      />
    );
  }

  // Estos flujos van por documento (`/public/documents/:id/sign`); sin id no hay a qué firmar.
  const documentId = session.document.id;
  if (!documentId) return <SigningSessionStatusView kind="INVALID" />;

  return (
    <PublicBiometricSigningFlow
      documentId={documentId}
      invitation={guestInvitationOf(session)}
      maskedEmail={session.signer.maskedEmail}
      onSigned={onSuccess}
      onError={(cause) => onError({ cause })}
    />
  );
}
