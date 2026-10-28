'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, PenLine, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad, {
  type SignaturePadHandle,
} from '@/components/signature/SignaturePad';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { getErrorMessage } from '@/lib/error-handler';
import SigningDocumentWorkspace from '../SigningDocumentWorkspace';
import {
  signSimpleRequest,
  verifyIdentityRequest,
} from '../invitation/invitation-requests';
import type { SignatureFlowProps } from '../signature-flows/types';
import type { SigningResult } from '../signing-session';
import {
  NothingToSign,
  SigningCompleted,
  SigningDocumentError,
  SigningPending,
  isUnexpectedSigningError,
  useCurrentSigningDocument,
  useSigningIdempotencyKey,
  useSigningLocation,
} from './session-signing';

/** Ruta a la que vuelve Didit: retoma la sesión pública con su cookie. */
export const SIGNING_SESSION_RETURN_PATH = '/sign/session';

/** Credenciales con identidad aprobada: ya se puede firmar (con o sin rúbrica registrada). */
const READY_TO_SIGN: ReadonlySet<string> = new Set([
  SigningCredentialStatus.SignaturePending,
  SigningCredentialStatus.Configured,
]);

/** Credenciales en las que la verificación ya no se puede reintentar desde aquí. */
const IDENTITY_BLOCKED: ReadonlySet<string> = new Set([
  SigningCredentialStatus.IdentityVerificationFailed,
  SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded,
]);

/**
 * Firma simple desde la sesión pública de una invitación individual, con el usuario provisional
 * que creó la integración. Reutiliza lo que la plataforma ya tiene, en el orden que exige el
 * backend:
 *
 * 1. **Correo**: ya validado con el código para abrir la sesión.
 * 2. **Identidad**: la verificación de Didit del onboarding (`SigningCredentialStatus`), sobre el
 *    usuario provisional. Didit vuelve a `/sign/session`.
 * 3. **Rúbrica**: si todavía no tiene, la dibuja aquí (`SignaturePad`) y se registra al firmar.
 * 4. **Firma**: con el hash del PDF revisado, su ubicación y una `Idempotency-Key`.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El paso en el que va el firmante, o el estado final.
 *
 * @example
 * ```tsx
 * <SessionSimpleSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function SessionSimpleSignatureFlow({
  session,
  onSuccess,
  onError,
}: SignatureFlowProps) {
  const credential = session.sessionDetails?.credentialStatus ?? null;
  const readyToSign = credential !== null && READY_TO_SIGN.has(credential);
  const needsSignatureImage =
    credential === SigningCredentialStatus.SignaturePending;

  const documentQuery = useCurrentSigningDocument();
  const idempotencyKey = useSigningIdempotencyKey();
  const { locate, locating } = useSigningLocation();
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [result, setResult] = useState<SigningResult | null>(null);

  const verifyIdentity = useMutation({
    mutationFn: () => verifyIdentityRequest(SIGNING_SESSION_RETURN_PATH),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) =>
      toast.error(
        getErrorMessage(error, 'No se pudo iniciar la verificación.'),
      ),
  });
  const sign = useMutation({
    mutationFn: (payload: Parameters<typeof signSimpleRequest>[0]) =>
      signSimpleRequest(payload, idempotencyKey),
  });

  async function handleSign() {
    const documentHash =
      documentQuery.data?.documentHash ?? session.sessionDetails?.documentHash;
    if (!documentHash) return;

    let signatureImage: Blob | undefined;
    if (needsSignatureImage) {
      signatureImage = (await padRef.current?.toPngBlob()) ?? undefined;
      if (!signatureImage) {
        toast.error('Dibuja tu firma antes de firmar.');
        return;
      }
    }
    const geolocation = await locate();
    if (!geolocation) return;

    sign.mutate(
      { documentHash, geolocation, signatureImage },
      {
        onSuccess: (response) => {
          const signed = { documentCompleted: response.data.documentCompleted };
          setResult(signed);
          onSuccess(signed);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, 'No se pudo registrar la firma.'));
          if (isUnexpectedSigningError(error)) onError({ cause: error });
        },
      },
    );
  }

  if (result) {
    return (
      <SigningCompleted documentName={session.document.name} result={result} />
    );
  }
  if (!session.sessionDetails?.canSign) return <NothingToSign />;

  if (!readyToSign) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifica tu identidad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {credential ===
          SigningCredentialStatus.IdentityVerificationInReview ? (
            <p role="status" className="text-sm text-muted-foreground">
              Tu verificación de identidad está en revisión. Vuelve a abrir tu
              invitación más tarde para firmar.
            </p>
          ) : credential && IDENTITY_BLOCKED.has(credential) ? (
            <p role="alert" className="text-sm text-destructive">
              No pudimos verificar tu identidad. Contacta a quien te envió el
              documento.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Antes de firmar confirmaremos tu identidad con una
                identificación oficial y una prueba de vida. Al terminar
                volverás a esta página.
              </p>
              <Button
                type="button"
                disabled={verifyIdentity.isPending}
                onClick={() => verifyIdentity.mutate()}
              >
                {verifyIdentity.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck className="size-4" aria-hidden />
                )}
                Verificar identidad
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (documentQuery.isLoading)
    return <SigningPending text="Cargando documento..." />;
  if (!documentQuery.data) {
    return (
      <SigningDocumentError onRetry={() => void documentQuery.refetch()} />
    );
  }

  const signing = sign.isPending || locating;

  return (
    <SigningDocumentWorkspace fileUrl={documentQuery.data.fileUrl}>
      <Card>
        <CardHeader>
          <CardTitle className="break-words text-base">
            {session.document.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Correo e identidad confirmados.
          </p>
          {needsSignatureImage && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Dibuja tu firma. Se usará en este documento.
              </p>
              <SignaturePad
                ref={padRef}
                height={160}
                disabled={signing}
                onStrokeChange={setHasStroke}
                ariaLabel="Área para dibujar tu firma"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={signing || !hasStroke}
                onClick={() => padRef.current?.clear()}
              >
                Borrar firma
              </Button>
            </div>
          )}
          <Button
            type="button"
            disabled={signing || (needsSignatureImage && !hasStroke)}
            onClick={() => void handleSign()}
          >
            {signing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <PenLine className="size-4" aria-hidden />
            )}
            {signing ? 'Firmando...' : 'Firmar documento'}
          </Button>
        </CardContent>
      </Card>
    </SigningDocumentWorkspace>
  );
}
