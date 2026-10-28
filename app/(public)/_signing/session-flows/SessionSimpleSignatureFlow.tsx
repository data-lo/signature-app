'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, PenLine, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad, {
  type SignaturePadHandle,
} from '@/components/signature/SignaturePad';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import SigningDocumentWorkspace from '../SigningDocumentWorkspace';
import {
  getIdentityVerificationRequest,
  signSimpleRequest,
  startIdentityVerificationRequest,
  type IdentityVerificationState,
} from '../invitation/invitation-requests';
import type { SignatureFlowProps } from '../signature-flows/types';
import type { SigningResult } from '../signing-session';
import {
  NothingToSign,
  SIGNING_ERROR_MESSAGES,
  SigningCompleted,
  SigningDocumentError,
  SigningPending,
  isUnexpectedSigningError,
  signingErrorCode,
  signingErrorMessage,
  useCurrentSigningDocument,
  useSigningIdempotencyKey,
  useSigningLocation,
} from './session-signing';

/** Ruta a la que vuelve Didit: retoma la sesión pública con su cookie. */
export const SIGNING_SESSION_RETURN_PATH = '/sign/session';

/** Cada cuánto se consulta el resultado de Didit mientras decide. */
export const IDENTITY_POLL_INTERVAL_MS = 5000;

/** Estados en los que Didit todavía no decide: se sigue consultando. */
const IDENTITY_IN_FLIGHT: ReadonlySet<IdentityVerificationState['status']> =
  new Set(['PENDING', 'IN_PROGRESS', 'IN_REVIEW']);

/** Credenciales con identidad aprobada (contrato anterior, sin `identityVerification`). */
const LEGACY_READY_TO_SIGN: ReadonlySet<string> = new Set([
  SigningCredentialStatus.SignaturePending,
  SigningCredentialStatus.Configured,
]);

/**
 * Firma simple desde la sesión pública de una invitación individual, con el usuario provisional
 * que creó la integración. Muestra sólo los pasos que la política del backend exige, en su orden:
 *
 * 1. **Correo**: ya validado con el código para abrir la sesión.
 * 2. **Identidad**: la verificación de Didit sobre el usuario provisional. Mientras Didit decide se
 *    consulta su estado (`GET …/simple/identity-verification`); aprobada, además, los datos leídos
 *    tienen que corresponder al firmante. Rechazada, vencida o de otra persona, se explica y no se
 *    deja firmar.
 * 3. **Rúbrica**: si todavía no tiene, la dibuja aquí (`SignaturePad`) y se registra al firmar.
 * 4. **Firma**: con el hash del PDF revisado, su ubicación y una `Idempotency-Key`. El backend
 *    vuelve a validar todo; si algo cambió, su código decide el mensaje.
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
  const details = session.sessionDetails;
  const credential = details?.credentialStatus ?? null;
  const needsSignatureImage =
    credential === SigningCredentialStatus.SignaturePending;
  const tracksIdentity = details?.identityVerification != null;

  const identityQuery = useQuery({
    queryKey: ['publicIdentityVerification'],
    queryFn: getIdentityVerificationRequest,
    enabled: tracksIdentity && Boolean(details?.canSign),
    initialData: details?.identityVerification ?? undefined,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && IDENTITY_IN_FLIGHT.has(query.state.data.status)
        ? IDENTITY_POLL_INTERVAL_MS
        : false,
  });
  const identity = tracksIdentity ? (identityQuery.data ?? null) : null;
  const identitySatisfied = tracksIdentity
    ? Boolean(identity?.satisfied)
    : credential !== null && LEGACY_READY_TO_SIGN.has(credential);

  const documentQuery = useCurrentSigningDocument();
  const idempotencyKey = useSigningIdempotencyKey();
  const { locate, locating } = useSigningLocation();
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [result, setResult] = useState<SigningResult | null>(null);

  const startIdentity = useMutation({
    mutationFn: () =>
      startIdentityVerificationRequest(SIGNING_SESSION_RETURN_PATH),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) =>
      toast.error(
        signingErrorMessage(error, 'No se pudo iniciar la verificación.'),
      ),
  });
  const sign = useMutation({
    mutationFn: (payload: Parameters<typeof signSimpleRequest>[0]) =>
      signSimpleRequest(payload, idempotencyKey),
  });

  async function handleSign() {
    const documentHash =
      documentQuery.data?.documentHash ?? details?.documentHash;
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
          toast.error(
            signingErrorMessage(error, 'No se pudo registrar la firma.'),
          );
          // La identidad cambió desde que se cargó la sesión: se vuelve a su paso.
          if (signingErrorCode(error)?.startsWith('IDENTITY_')) {
            void identityQuery.refetch();
          }
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
  if (!details?.canSign) return <NothingToSign />;

  if (!identitySatisfied) {
    return (
      <IdentityVerificationStep
        identity={identity}
        legacyCredential={tracksIdentity ? null : credential}
        starting={startIdentity.isPending}
        onStart={() => startIdentity.mutate()}
      />
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

/**
 * Paso de verificación de identidad: qué falta y, si se puede, cómo iniciarla o retomarla.
 *
 * @param props.identity - Estado evaluado por el backend; `null` con el contrato anterior.
 * @param props.legacyCredential - Credencial del contrato anterior (sin `identityVerification`).
 * @param props.starting - Se está abriendo Didit.
 * @param props.onStart - Inicia (o vuelve a intentar) la verificación.
 * @returns La tarjeta del paso.
 *
 * @example
 * ```tsx
 * <IdentityVerificationStep identity={identity} legacyCredential={null} starting={false} onStart={start} />
 * ```
 */
function IdentityVerificationStep({
  identity,
  legacyCredential,
  starting,
  onStart,
}: {
  identity: IdentityVerificationState | null;
  legacyCredential: string | null;
  starting: boolean;
  onStart: () => void;
}) {
  const rejected =
    identity?.errorCode === 'IDENTITY_VERIFICATION_REJECTED' ||
    legacyCredential === SigningCredentialStatus.IdentityVerificationFailed ||
    legacyCredential ===
      SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded;
  const mismatch = identity?.errorCode === 'IDENTITY_DATA_MISMATCH';
  const inReview =
    identity?.status === 'IN_REVIEW' ||
    legacyCredential === SigningCredentialStatus.IdentityVerificationInReview;
  const inProgress =
    identity?.status === 'PENDING' || identity?.status === 'IN_PROGRESS';

  let body: React.ReactNode;
  if (rejected || mismatch) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {
          SIGNING_ERROR_MESSAGES[
            mismatch
              ? 'IDENTITY_DATA_MISMATCH'
              : 'IDENTITY_VERIFICATION_REJECTED'
          ]
        }
      </p>
    );
  } else if (inReview) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Tu verificación de identidad está en revisión. Esta página se
        actualizará sola cuando termine; también puedes volver a abrir tu
        invitación más tarde.
      </p>
    );
  } else if (inProgress) {
    body = (
      <>
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Esperando el resultado de tu verificación de identidad...
        </p>
        {identity?.resumeUrl && (
          <a
            href={identity.resumeUrl}
            className={buttonVariants({ variant: 'outline' })}
          >
            <ExternalLink className="size-4" aria-hidden />
            Continuar verificación
          </a>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          {identity?.status === 'EXPIRED'
            ? 'Tu verificación anterior no se completó a tiempo. Vuelve a intentarlo: '
            : 'Antes de firmar '}
          confirmaremos tu identidad con una identificación oficial y una prueba
          de vida. Al terminar volverás a esta página.
        </p>
        <Button type="button" disabled={starting} onClick={onStart}>
          {starting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          Verificar identidad
        </Button>
      </>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Verifica tu identidad</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Correo confirmado.
        </p>
        {body}
      </CardContent>
    </Card>
  );
}
