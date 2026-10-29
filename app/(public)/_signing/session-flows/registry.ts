import type { ComponentType } from 'react';
import type { SignatureFlowType } from '../signing-session';
import type { SignatureFlowProps } from '../signature-flows/types';
import SessionAdvancedSignatureFlow from './SessionAdvancedSignatureFlow';
import SessionBiometricSignatureFlow from './SessionBiometricSignatureFlow';
import SessionSimpleSignatureFlow from './SessionSimpleSignatureFlow';

/**
 * Flujos por tipo de firma de la sesión pública de una invitación individual. Los usan por igual el
 * correo (`/sign/:token`) y el portal del tercero (`/sign/launch/:token`): lo único que cambia
 * entre los dos es el token inicial. Se resuelven con el mismo `SignatureFlowResolver` que los
 * flujos de invitado de `/public/documents/:id/sign`.
 */
export const sessionSignatureFlows: Readonly<
  Record<SignatureFlowType, ComponentType<SignatureFlowProps>>
> = {
  SIMPLE: SessionSimpleSignatureFlow,
  ADVANCED: SessionAdvancedSignatureFlow,
  BIOMETRIC: SessionBiometricSignatureFlow,
};
