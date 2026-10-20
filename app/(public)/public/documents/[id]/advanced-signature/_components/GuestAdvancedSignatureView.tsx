'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, KeyRound, Loader2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/lib/axios';
import { getAuthToken } from '@/lib/cookies';
import { setPendingSignatureContext } from '@/lib/pending-signature-context';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { GEOLOCATION_ERROR_MESSAGES } from '@/lib/hooks/geolocation-error-messages';
import { logSafeError } from '@/lib/observability/safe-log';
import AdvancedSignatureDialog, {
  type AdvancedSignatureSubmitValues,
} from '@/app/dashboard/documents/[documentId]/_components/AdvancedSignatureDialog';
import { useGuestAccess } from '../../biometric-signature/_hooks/useGuestAccess';
import { isGuestAccessExpired } from '../../biometric-signature/_hooks/useGuestBiometricSignature';
import type { GuestInvitation } from '../_requests';
import {
  ADVANCED_GUEST_ACCESS_PREFIX,
  useGuestAdvancedSigningDocument,
  useSignGuestAdvancedDocument,
} from '../_hooks/useGuestAdvancedSignature';
import GuestAdvancedAccessCodeStep from './GuestAdvancedAccessCodeStep';

// react-pdf necesita el DOM: el visor sólo se carga en el cliente, igual que en la vista pública.
const PublicPdfViewer = dynamic(
  () => import('../../_components/PublicPdfViewer'),
  { ssr: false },
);

const EXPIRED_ACCESS_NOTICE =
  'Tu acceso venció o ya no es válido. Solicita un nuevo código para continuar con la firma.';

const LINKED_INVITATION_NOTICE =
  'Esta invitación ya está vinculada a una cuenta. Inicia sesión con esa cuenta para firmar.';

interface GuestAdvancedSignatureViewProps {
  documentId: string;
  /** Colaborador y correo del enlace de invitación; `null` si el enlace llegó incompleto. */
  invitation: GuestInvitation | null;
}

/**
 * Firma Electrónica Avanzada (e.firma) de un invitado, con o sin cuenta:
 *
 * - **Tengo una cuenta**: con sesión, vincula la cuenta a la invitación y lleva al documento en el
 *   dashboard; sin sesión, guarda el contexto y manda a `/login`, que vincula al entrar. La firma
 *   sigue por el flujo privado de siempre.
 * - **Firmar sin cuenta**: valida un código enviado al correo de la invitación, muestra el
 *   documento y firma con `.cer`, `.key`, contraseña y ubicación. No crea ninguna cuenta.
 *
 * Un acceso vencido o revocado (401) vuelve al paso del código; nunca manda a iniciar sesión.
 */
export default function GuestAdvancedSignatureView({
  documentId,
  invitation,
}: GuestAdvancedSignatureViewProps) {
  const router = useRouter();
  const { access, loaded, save, clear } = useGuestAccess(
    documentId,
    ADVANCED_GUEST_ACCESS_PREFIX,
  );
  const [mode, setMode] = useState<'choose' | 'guest'>('choose');
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
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
    setNotice(
      isGuestAccessExpired(accessError)
        ? EXPIRED_ACCESS_NOTICE
        : LINKED_INVITATION_NOTICE,
    );
  }, [accessError, clear]);

  async function continueWithAccount() {
    if (!invitation) return;

    if (!getAuthToken()) {
      setPendingSignatureContext({ documentId, ...invitation });
      router.push('/login');
      return;
    }

    setLinkingAccount(true);
    try {
      await apiClient.patch(`/api/v1/document/${documentId}/link-collaborator`);
    } catch (error) {
      logSafeError(
        '[advanced-signature] no se pudo vincular la cuenta al documento',
        error,
      );
    }
    router.replace(`/dashboard/documents/${documentId}`);
  }

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
          <p className="font-medium">Firma registrada</p>
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
    if (!invitation) {
      return (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Abre esta página desde el enlace del correo de invitación.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Firma Electrónica Avanzada</CardTitle>
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

          {mode === 'choose' ? (
            <>
              <p className="text-sm">
                Te invitaron a firmar este documento con tu e.firma. Puedes
                hacerlo desde tu cuenta o sin crear una.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={linkingAccount}
                onClick={() => void continueWithAccount()}
              >
                <UserRound className="size-4" aria-hidden />
                {linkingAccount
                  ? 'Vinculando tu cuenta...'
                  : 'Tengo una cuenta'}
              </Button>
              <Button type="button" onClick={() => setMode('guest')}>
                <KeyRound className="size-4" aria-hidden />
                Firmar sin cuenta
              </Button>
            </>
          ) : (
            <>
              <GuestAdvancedAccessCodeStep
                documentId={documentId}
                invitation={invitation}
                onVerified={(next) => {
                  setNotice(null);
                  save(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('choose')}
              >
                Volver
              </Button>
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
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            No se pudo cargar el documento de esta invitación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="h-[75vh] overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <PublicPdfViewer file={document.fileUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="break-words text-base">
            {document.fileName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {document.canSign && document.documentHash ? (
            <>
              <p className="text-sm text-muted-foreground">
                Revisa el documento. Al firmar, necesitarás tu llave privada
                (.key), tu certificado (.cer), la contraseña de tu e.firma y
                permitir el acceso a tu ubicación.
              </p>
              <Button
                type="button"
                disabled={sign.isPending || geoStatus === 'requesting'}
                onClick={() => setDialogOpen(true)}
              >
                <KeyRound className="size-4" aria-hidden />
                Firmar con e.firma
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
        confirming={sign.isPending || geoStatus === 'requesting'}
      />
    </div>
  );
}
