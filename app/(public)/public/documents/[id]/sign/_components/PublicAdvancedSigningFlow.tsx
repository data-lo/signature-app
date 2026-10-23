'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { isAxiosError } from 'axios';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { GEOLOCATION_ERROR_MESSAGES } from '@/lib/hooks/geolocation-error-messages';
import AdvancedSignatureDialog, {
  type AdvancedSignatureSubmitValues,
} from '@/app/dashboard/documents/[documentId]/_components/AdvancedSignatureDialog';
import { useGuestAccess } from '../../biometric-signature/_hooks/useGuestAccess';
import { isGuestAccessExpired } from '../../biometric-signature/_hooks/useGuestBiometricSignature';
import type { GuestInvitation } from '../../advanced-signature/_requests';
import {
  ADVANCED_GUEST_ACCESS_PREFIX,
  useGuestAdvancedSigningDocument,
  useSignGuestAdvancedDocument,
} from '../../advanced-signature/_hooks/useGuestAdvancedSignature';
import GuestAdvancedAccessCodeStep from '../../advanced-signature/_components/GuestAdvancedAccessCodeStep';

// react-pdf necesita el DOM: el visor sólo se carga en el cliente, igual que en la vista pública.
const PublicPdfViewer = dynamic(
  () => import('../../_components/PublicPdfViewer'),
  { ssr: false },
);

export const EXPIRED_ACCESS_NOTICE =
  'Tu acceso venció o ya no es válido. Solicita un nuevo código para continuar con la firma.';

export const LINKED_INVITATION_NOTICE =
  'Esta invitación ya está vinculada a una cuenta. Inicia sesión con esa cuenta para firmar.';

interface PublicAdvancedSigningFlowProps {
  documentId: string;
  /** Invitación del enlace (colaborador y, si la URL lo trae, correo). */
  invitation: GuestInvitation;
  /** Correo invitado enmascarado por el backend, para el paso del código. */
  maskedEmail?: string;
}

/** Encabezado con el paso en curso, para que el invitado sepa siempre dónde va. */
function StepLabel({ step, text }: { step: 1 | 2; text: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Paso {step} de 2 · {text}
    </p>
  );
}

/**
 * Firma Electrónica Avanzada (e.firma) de un invitado SIN cuenta, dentro de la pantalla pública
 * `/public/documents/:id/sign`. Se monta cuando el invitado eligió "Continuar sin cuenta" en
 * `PublicInvitationEntry`; la opción de iniciar sesión ya se ofreció ahí.
 *
 * 1. **Confirma tu correo**: código de 6 dígitos al correo de la invitación. El código sólo acredita
 *    el correo; lo que autoriza la firma es el acceso temporal que se emite al canjearlo.
 * 2. **Revisa y firma**: visor del documento y firma con `.cer`, `.key`, contraseña y ubicación,
 *    atada al hash del PDF que revisó.
 * 3. **Firma registrada**: confirmación, distinguiendo si el documento quedó completo.
 *
 * Un acceso vencido o revocado (401) vuelve al paso del código con un aviso; una invitación que se
 * vinculó a una cuenta mientras tanto (403) lo dice y deja de ofrecer la firma sin cuenta. Los
 * errores de la e.firma (422) llegan como aviso con el mensaje del backend y no gastan el acceso.
 *
 * @param props.documentId - Documento de la invitación.
 * @param props.invitation - Colaborador y, si viene, correo del enlace.
 * @param props.maskedEmail - Correo enmascarado por el backend.
 * @returns El paso del flujo en el que va el invitado.
 *
 * @example
 * ```tsx
 * <PublicAdvancedSigningFlow documentId="doc-1" invitation={{ collaboratorId: 'c-1' }} maskedEmail="a***@correo.mx" />
 * ```
 */
export default function PublicAdvancedSigningFlow({
  documentId,
  invitation,
  maskedEmail,
}: PublicAdvancedSigningFlowProps) {
  const { access, loaded, save, clear } = useGuestAccess(
    documentId,
    ADVANCED_GUEST_ACCESS_PREFIX,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [invitationLinked, setInvitationLinked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<{ documentCompleted: boolean } | null>(
    null,
  );
  const { status: geoStatus, requestLocation } = useGeolocation();

  const token = access?.accessToken ?? null;
  const documentQuery = useGuestAdvancedSigningDocument(documentId, token);
  const sign = useSignGuestAdvancedDocument(documentId, token);

  /** Un 401 significa que el acceso ya no sirve; un 403, que la invitación dejó de ser pública. */
  const accessError = [documentQuery.error, sign.error].find(
    (error) =>
      isGuestAccessExpired(error) ||
      (isAxiosError(error) && error.response?.status === 403),
  );
  useEffect(() => {
    if (!accessError) return;
    clear();
    setDialogOpen(false);
    const expired = isGuestAccessExpired(accessError);
    setInvitationLinked(!expired);
    setNotice(expired ? EXPIRED_ACCESS_NOTICE : LINKED_INVITATION_NOTICE);
  }, [accessError, clear]);

  async function handleSign(values: AdvancedSignatureSubmitValues) {
    const documentHash = documentQuery.data?.documentHash;
    if (!documentHash) return;

    const { coords, error } = await requestLocation();
    if (error || !coords) {
      const reason = error
        ? GEOLOCATION_ERROR_MESSAGES[error]
        : 'no se pudo determinar tu ubicación';
      toast.error(`No se puede firmar sin tu ubicación: ${reason}.`);
      return;
    }

    sign.mutate(
      { ...values, geolocation: coords, documentHash },
      {
        onSuccess: (data) => {
          setDialogOpen(false);
          setResult(data);
          // El acceso quedó consumido: guardarlo sólo dejaría un token inútil.
          clear();
        },
        onError: (signError) => {
          // Si el documento cambió, se vuelve a cargar para que lo revise antes de reintentar.
          if (isAxiosError(signError) && signError.response?.status === 400) {
            void documentQuery.refetch();
          }
        },
      },
    );
  }

  if (!loaded) {
    return null;
  }

  if (result) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
          <p role="status" className="font-medium">
            Firma registrada
          </p>
          <p className="text-sm text-muted-foreground">
            Firmaste con tu e.firma. Guardamos la evidencia de la firma: fecha y
            hora, tu certificado y la validación por correo.
          </p>
          <p className="text-sm text-muted-foreground">
            {result.documentCompleted
              ? 'El documento quedó firmado por todos. Puedes cerrar esta página.'
              : 'Avisaremos a los demás firmantes. Puedes cerrar esta página.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!access) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="gap-1">
          <StepLabel step={1} text="Confirma tu correo" />
          <CardTitle>Firma Electrónica Avanzada sin cuenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {notice && (
            <p
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {notice}
            </p>
          )}
          {!invitationLinked && (
            <>
              <p className="text-sm text-muted-foreground">
                No necesitas una cuenta. Confirma que recibiste la invitación y
                después firma con tu e.firma: llave privada (.key), certificado
                (.cer) y su contraseña.
              </p>
              <GuestAdvancedAccessCodeStep
                documentId={documentId}
                invitation={invitation}
                maskedEmail={maskedEmail}
                onVerified={(next) => {
                  setNotice(null);
                  save(next);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (documentQuery.isLoading) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Cargando documento...
      </p>
    );
  }

  const document = documentQuery.data;
  if (!document) {
    // Un acceso que dejó de servir no es un fallo de carga: el efecto de arriba vuelve al código.
    if (accessError) return null;
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col gap-3 pt-6">
          <p role="alert" className="text-sm text-destructive">
            No se pudo cargar el documento de esta invitación.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void documentQuery.refetch()}
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const signing = sign.isPending || geoStatus === 'requesting';

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="h-[75vh] overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <PublicPdfViewer file={document.fileUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <StepLabel step={2} text="Revisa y firma" />
          <CardTitle className="break-words text-base">
            {document.fileName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Correo confirmado.
          </p>
          {document.canSign && document.documentHash ? (
            <>
              <p className="text-sm text-muted-foreground">
                Revisa el documento. Al firmar, necesitarás tu llave privada
                (.key), tu certificado (.cer), la contraseña de tu e.firma y
                permitir el acceso a tu ubicación.
              </p>
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este documento no tiene una firma pendiente para ti en este
              momento.
            </p>
          )}
        </CardContent>
      </Card>

      <AdvancedSignatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => void handleSign(values)}
        confirming={signing}
      />
    </div>
  );
}
