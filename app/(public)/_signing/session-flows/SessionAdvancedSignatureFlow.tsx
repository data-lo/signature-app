'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdvancedSignatureDialog, {
  type AdvancedSignatureSubmitValues,
} from '@/app/dashboard/documents/[documentId]/_components/AdvancedSignatureDialog';
import SigningDocumentWorkspace from '../SigningDocumentWorkspace';
import {
  signAdvancedRequest,
  type CertificateRequirements,
} from '../invitation/invitation-requests';
import type { SignatureFlowProps } from '../signature-flows/types';
import type { SigningResult } from '../signing-session';
import {
  NothingToSign,
  SigningCompleted,
  SigningDocumentError,
  SigningPending,
  isUnexpectedSigningError,
  signingErrorMessage,
  useCurrentSigningDocument,
  useSigningIdempotencyKey,
  useSigningLocation,
} from './session-signing';

/**
 * Lo que se valida del certificado, en palabras del firmante.
 *
 * @param requirements - Requisitos que resolvió el backend; `null` si no los mandó.
 * @returns Una etiqueta por validación activa.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * certificateCheckLabels({ validateValidity: true, validateRevocation: false, validateSubjectMatch: false });
 * // ['Que esté vigente y emitido por el SAT']
 * ```
 */
export function certificateCheckLabels(
  requirements: CertificateRequirements | null,
): string[] {
  if (!requirements) return [];
  return [
    requirements.validateValidity && 'Que esté vigente y emitido por el SAT',
    requirements.validateRevocation && 'Que el SAT no lo haya revocado',
    requirements.validateSubjectMatch &&
      'Que su titular sea la persona invitada a firmar',
  ].filter((label): label is string => Boolean(label));
}

/**
 * Firma Electrónica Avanzada desde la sesión pública de una invitación individual (correo o
 * portal del tercero). El correo ya se validó con el código, así que aquí va directo al documento:
 * visor con las posiciones de firma y la e.firma (`.cer` + `.key` + contraseña) en el mismo
 * diálogo del panel (`AdvancedSignatureDialog`).
 *
 * La firma lleva el hash del PDF revisado y una `Idempotency-Key`; un reintento no firma dos veces.
 *
 * @param props - Contrato común de los flujos (ver `SignatureFlowProps`).
 * @returns El visor y el panel de firma, o el estado final.
 *
 * @example
 * ```tsx
 * <SessionAdvancedSignatureFlow session={session} onSuccess={…} onError={…} />
 * ```
 */
export default function SessionAdvancedSignatureFlow({
  session,
  onSuccess,
  onError,
}: SignatureFlowProps) {
  const documentQuery = useCurrentSigningDocument();
  const idempotencyKey = useSigningIdempotencyKey();
  const { locate, locating } = useSigningLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<SigningResult | null>(null);
  const sign = useMutation({
    mutationFn: (payload: Parameters<typeof signAdvancedRequest>[0]) =>
      signAdvancedRequest(payload, idempotencyKey),
  });

  async function handleSign(values: AdvancedSignatureSubmitValues) {
    const documentHash =
      documentQuery.data?.documentHash ?? session.sessionDetails?.documentHash;
    if (!documentHash) return;
    const geolocation = await locate();
    if (!geolocation) return;

    sign.mutate(
      { ...values, geolocation, documentHash },
      {
        onSuccess: (response) => {
          setDialogOpen(false);
          const signed = { documentCompleted: response.data.documentCompleted };
          setResult(signed);
          onSuccess(signed);
        },
        onError: (error) => {
          toast.error(
            signingErrorMessage(error, 'No se pudo registrar la firma.'),
          );
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
  if (documentQuery.isLoading)
    return <SigningPending text="Cargando documento..." />;
  if (!documentQuery.data) {
    return (
      <SigningDocumentError onRetry={() => void documentQuery.refetch()} />
    );
  }

  const signing = sign.isPending || locating;
  const certificateChecks = certificateCheckLabels(
    session.sessionDetails.certificateRequirements ?? null,
  );

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
            Correo confirmado.
          </p>
          <p className="text-sm text-muted-foreground">
            Revisa el documento. Al firmar, necesitarás tu llave privada (.key),
            tu certificado (.cer), la contraseña de tu e.firma y permitir el
            acceso a tu ubicación.
          </p>
          {certificateChecks.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground">
                Al firmar validaremos tu certificado:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {certificateChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            type="button"
            disabled={signing}
            onClick={() => setDialogOpen(true)}
          >
            {signing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="size-4" aria-hidden />
            )}
            {signing ? 'Firmando...' : 'Firmar con e.firma'}
          </Button>
        </CardContent>
      </Card>

      <AdvancedSignatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => void handleSign(values)}
        confirming={signing}
      />
    </SigningDocumentWorkspace>
  );
}
