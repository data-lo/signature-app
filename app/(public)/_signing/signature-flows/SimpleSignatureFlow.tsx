'use client';

import AccountSigningAccess from '../AccountSigningAccess';
import type { SignatureFlowProps } from './types';

/**
 * Firma simple (`SIMPLE`). Estampa la rúbrica registrada en la cuenta del firmante, así que se
 * completa desde su cuenta: reutiliza la entrada por cuenta de la pantalla pública actual, que tras
 * el login vincula la invitación y abre el documento en el panel, con la verificación de correo
 * (OTP), la validación de identidad configurada y la firma.
 *
 * Todavía no hay firma simple sin cuenta: un firmante sin cuenta inicia sesión o se registra desde
 * el login, y uno con la cuenta pendiente de activar (`PROVISIONED`) ve ese estado.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El acceso por cuenta.
 *
 * @example
 * ```tsx
 * <SimpleSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function SimpleSignatureFlow({ session }: SignatureFlowProps) {
  return (
    <AccountSigningAccess
      session={session}
      description="La firma simple usa la firma registrada en tu cuenta. Inicia sesión (o crea tu cuenta) para verificar tu correo y tu identidad y firmar el documento."
    />
  );
}
