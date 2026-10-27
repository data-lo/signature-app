'use client';

import { useCallback } from 'react';
import { logSafeError } from '@/lib/observability/safe-log';
import SignerSummary from './SignerSummary';
import SigningSessionStatusView from './SigningSessionStatusView';
import { useSigningSession } from './SigningSessionProvider';
import SignatureFlowResolver from './signature-flows/SignatureFlowResolver';
import { isActiveSigningSession, type SigningError } from './signing-session';

/**
 * Pantalla pública de firma, compartida por `/public/documents/:id/sign` y `/sign/:token`. Cada
 * ruta sólo adapta su contexto a `SigningSession` (ver `SigningSessionProvider`); de ahí en
 * adelante la experiencia es la misma:
 *
 * - Sesión no activa → estado controlado (`SigningSessionStatusView`), sin PDF ni datos.
 * - Sesión activa → `SignerSummary` y el flujo del tipo de firma (`SignatureFlowResolver`). El
 *   visor del documento y las posiciones de firma los monta el flujo
 *   (`SigningDocumentWorkspace`) una vez que el backend validó al firmante.
 *
 * Los fallos inesperados de un flujo se registran con `logSafeError`, que no manda URLs, tokens
 * ni cuerpos.
 *
 * @returns La pantalla del estado actual de la sesión.
 *
 * @example
 * ```tsx
 * <SigningSessionProvider state={state}><PublicSigningLayout /></SigningSessionProvider>
 * ```
 */
export default function PublicSigningLayout() {
  const { state, setResult, retry } = useSigningSession();
  const handleError = useCallback(
    (error: SigningError) => logSafeError('[public-signing]', error.cause),
    [],
  );

  if (!isActiveSigningSession(state)) {
    return <SigningSessionStatusView kind={state.status} onRetry={retry} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <SignerSummary session={state} />
      <SignatureFlowResolver
        session={state}
        onSuccess={setResult}
        onError={handleError}
      />
    </div>
  );
}
