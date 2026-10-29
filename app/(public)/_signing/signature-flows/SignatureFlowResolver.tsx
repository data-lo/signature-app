'use client';

import SigningSessionStatusView from '../SigningSessionStatusView';
import {
  resolveSignatureFlow,
  signatureFlows,
  type SignatureFlowRegistry,
} from './registry';
import type { SignatureFlowProps } from './types';

interface SignatureFlowResolverProps extends SignatureFlowProps {
  /** Registro a usar; por omisión, `signatureFlows`. */
  registry?: SignatureFlowRegistry;
}

/**
 * Monta el flujo del tipo de firma que resolvió el backend para esta sesión. El firmante nunca lo
 * elige. Si el tipo no está registrado, muestra un estado controlado: no aplica un flujo por
 * defecto.
 *
 * @param props - Sesión, callbacks del flujo y, opcional, el registro.
 * @returns El flujo, o el estado `UNSUPPORTED`.
 *
 * @example
 * ```tsx
 * <SignatureFlowResolver session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function SignatureFlowResolver({
  registry = signatureFlows,
  ...flowProps
}: SignatureFlowResolverProps) {
  const Flow = resolveSignatureFlow(flowProps.session.signature.type, registry);
  if (!Flow) return <SigningSessionStatusView kind="UNSUPPORTED" />;
  return <Flow {...flowProps} />;
}
