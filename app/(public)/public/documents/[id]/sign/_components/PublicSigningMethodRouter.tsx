'use client';

import { SignatureType } from '@/lib/enums/document';
import type { GuestInvitation } from '../../biometric-signature/_requests';
import PublicBiometricSigningFlow from '../../biometric-signature/_components/PublicBiometricSigningFlow';
import PublicAdvancedSigningFlow from './PublicAdvancedSigningFlow';

interface PublicSigningMethodRouterProps {
  documentId: string;
  /** Invitación del enlace; `null` sólo al volver de Didit, donde el flujo retoma con su acceso. */
  invitation: GuestInvitation | null;
  /** Tipo de firma que exige el documento, tal como lo resolvió el backend. */
  signatureType: SignatureType | null;
  /** Correo invitado enmascarado por el backend, para el paso del código. */
  maskedEmail?: string;
}

/**
 * Monta el flujo de firma sin cuenta del tipo que exige el documento. El invitado nunca lo elige:
 * el tipo llega del backend (`GET /public/documents/:id/invitation`) y no hay ningún control para
 * cambiarlo.
 *
 * - `BIOMETRIC` → `PublicBiometricSigningFlow` (código al correo, consentimiento y ubicación,
 *   Didit, estado de la firma).
 * - `FIEL` → `PublicAdvancedSigningFlow` (código al correo, visor del documento y firma con
 *   `.cer` + `.key` + contraseña).
 * - Cualquier otro → nada: `PublicInvitationEntry` no ofrece continuar sin cuenta en ese caso.
 *
 * @param props - Documento, invitación, tipo de firma y correo enmascarado.
 * @returns El flujo del tipo, o `null`.
 *
 * @example
 * ```tsx
 * <PublicSigningMethodRouter documentId="doc-1" invitation={invitation} signatureType={SignatureType.BIOMETRIC} />
 * ```
 */
export default function PublicSigningMethodRouter({
  documentId,
  invitation,
  signatureType,
  maskedEmail,
}: PublicSigningMethodRouterProps) {
  if (signatureType === SignatureType.BIOMETRIC) {
    return (
      <PublicBiometricSigningFlow
        documentId={documentId}
        invitation={invitation}
        maskedEmail={maskedEmail}
      />
    );
  }

  if (signatureType === SignatureType.Fiel && invitation) {
    return (
      <PublicAdvancedSigningFlow
        documentId={documentId}
        invitation={invitation}
        maskedEmail={maskedEmail}
      />
    );
  }

  return null;
}
