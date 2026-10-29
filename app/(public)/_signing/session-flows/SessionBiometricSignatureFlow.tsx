'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BiometricSignaturePanel from '@/components/biometric-signature/BiometricSignaturePanel';
import { biometricPollInterval } from '@/lib/biometric-signature';
import { getErrorMessage } from '@/lib/error-handler';
import SigningDocumentWorkspace from '../SigningDocumentWorkspace';
import {
  getBiometricSigningStatusRequest,
  startBiometricSigningRequest,
} from '../invitation/invitation-requests';
import type { SignatureFlowProps } from '../signature-flows/types';
import {
  NothingToSign,
  SigningDocumentError,
  SigningPending,
  isUnexpectedSigningError,
  useCurrentSigningDocument,
  useSigningIdempotencyKey,
  useSigningLocation,
} from './session-signing';

const BIOMETRIC_STATUS_KEY = ['publicSigningBiometricStatus'];

/**
 * Firma con biometría desde la sesión pública de una invitación individual. Reutiliza el panel de
 * la plataforma (`BiometricSignaturePanel`): consentimiento y ubicación, sesión de Didit (QR o
 * enlace) y el estado del intento, que se sondea hasta el desenlace. La firma la registra el
 * webhook de Didit, nunca esta pantalla; Didit vuelve a `/sign/session`.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El visor y el panel biométrico.
 *
 * @example
 * ```tsx
 * <SessionBiometricSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function SessionBiometricSignatureFlow({
  session,
  onSuccess,
  onError,
}: SignatureFlowProps) {
  const queryClient = useQueryClient();
  const documentQuery = useCurrentSigningDocument();
  const idempotencyKey = useSigningIdempotencyKey();
  const { locate, locating } = useSigningLocation();
  const [geoBlockedReason, setGeoBlockedReason] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: BIOMETRIC_STATUS_KEY,
    queryFn: getBiometricSigningStatusRequest,
    retry: false,
    refetchInterval: (query) => biometricPollInterval(query.state.data),
  });
  const start = useMutation({
    mutationFn: (
      geolocation: Parameters<typeof startBiometricSigningRequest>[0],
    ) => startBiometricSigningRequest(geolocation, idempotencyKey),
    onSuccess: (attempt) =>
      queryClient.setQueryData(BIOMETRIC_STATUS_KEY, attempt),
    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'No se pudo iniciar la verificación.'),
      );
      if (isUnexpectedSigningError(error)) onError({ cause: error });
    },
  });

  const attempt = statusQuery.data ?? null;
  const signedNotified = useRef(false);
  useEffect(() => {
    if (!attempt?.signatureCompleted || signedNotified.current) return;
    signedNotified.current = true;
    onSuccess({ documentCompleted: Boolean(attempt.documentCompleted) });
  }, [attempt, onSuccess]);

  async function handleStart() {
    const geolocation = await locate();
    if (!geolocation) {
      setGeoBlockedReason('no se pudo determinar tu ubicación');
      return;
    }
    setGeoBlockedReason(null);
    start.mutate(geolocation);
  }

  if (!session.sessionDetails?.canSign && !attempt) return <NothingToSign />;
  if (documentQuery.isLoading)
    return <SigningPending text="Cargando documento..." />;
  if (!documentQuery.data) {
    return (
      <SigningDocumentError onRetry={() => void documentQuery.refetch()} />
    );
  }

  return (
    <SigningDocumentWorkspace fileUrl={documentQuery.data.fileUrl}>
      <Card>
        <CardHeader>
          <CardTitle className="break-words text-base">
            {session.document.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BiometricSignaturePanel
            session={attempt}
            isLoading={statusQuery.isLoading}
            geoBlockedReason={geoBlockedReason}
            isRequestingLocation={locating}
            isStarting={start.isPending}
            onStart={() => void handleStart()}
            verificationScope="document"
          />
          {attempt?.signatureCompleted && (
            <p className="text-sm text-muted-foreground">
              {attempt.documentCompleted
                ? 'El documento quedó firmado por todos. Puedes cerrar esta página.'
                : 'Avisaremos a los demás firmantes. Puedes cerrar esta página.'}
            </p>
          )}
        </CardContent>
      </Card>
    </SigningDocumentWorkspace>
  );
}
