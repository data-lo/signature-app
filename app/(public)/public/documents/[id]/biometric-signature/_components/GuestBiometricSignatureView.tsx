'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BiometricSignaturePanel from '@/components/biometric-signature/BiometricSignaturePanel';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { GEOLOCATION_ERROR_MESSAGES } from '@/lib/hooks/geolocation-error-messages';
import type { GuestInvitation } from '../_requests';
import { useGuestAccess } from '../_hooks/useGuestAccess';
import {
  isGuestAccessExpired,
  useGuestBiometricSession,
  useGuestSigningDocument,
  useStartGuestBiometricSession,
} from '../_hooks/useGuestBiometricSignature';
import GuestAccessCodeStep from './GuestAccessCodeStep';

// react-pdf necesita el DOM: el visor sólo se carga en el cliente, igual que en la vista pública.
const PublicPdfViewer = dynamic(
  () => import('../../_components/PublicPdfViewer'),
  { ssr: false },
);

const EXPIRED_ACCESS_NOTICE =
  'Tu acceso venció. Solicita un nuevo código para continuar con la firma.';

interface GuestBiometricSignatureViewProps {
  documentId: string;
  /** Colaborador y correo del enlace de invitación; `null` si el enlace llegó incompleto. */
  invitation: GuestInvitation | null;
}

/**
 * Firma biométrica de un invitado sin cuenta, de punta a punta:
 *
 * 1. Valida la posesión de la invitación con un código enviado al correo.
 * 2. Muestra el documento que se le pide firmar.
 * 3. Con su consentimiento y su ubicación, abre la sesión de Didit (identificación + prueba de vida
 *    + comparación facial) y muestra el QR o el enlace.
 * 4. Sondea el estado hasta el desenlace. Lo decide el webhook de Didit, nunca esta pantalla.
 *
 * Un acceso vencido (401) no manda a iniciar sesión: vuelve al paso 1.
 */
export default function GuestBiometricSignatureView({
  documentId,
  invitation,
}: GuestBiometricSignatureViewProps) {
  const { access, loaded, save, clear } = useGuestAccess(documentId);
  const [notice, setNotice] = useState<string | null>(null);
  const [geoBlockedReason, setGeoBlockedReason] = useState<string | null>(null);
  const { status: geoStatus, requestLocation } = useGeolocation();

  const token = access?.accessToken ?? null;
  const documentQuery = useGuestSigningDocument(documentId, token);
  const sessionQuery = useGuestBiometricSession(documentId, token);
  const start = useStartGuestBiometricSession(documentId, token);

  /** Cualquier 401 de las peticiones con token significa que el acceso ya no sirve. */
  const accessExpired = [
    documentQuery.error,
    sessionQuery.error,
    start.error,
  ].some(isGuestAccessExpired);
  useEffect(() => {
    if (!accessExpired) return;
    clear();
    setNotice(EXPIRED_ACCESS_NOTICE);
  }, [accessExpired, clear]);

  async function handleStart() {
    const { coords, error } = await requestLocation();
    if (error || !coords) {
      const reason = error
        ? GEOLOCATION_ERROR_MESSAGES[error]
        : 'no se pudo determinar tu ubicación';
      setGeoBlockedReason(reason);
      toast.error(`No se puede firmar sin tu ubicación: ${reason}.`);
      return;
    }
    setGeoBlockedReason(null);
    start.mutate(coords);
  }

  if (!loaded) {
    return null;
  }

  if (!access) {
    /**
     * Sin invitación en la URL sólo se puede seguir con un acceso ya canjeado en esta pestaña: es
     * el caso de volver de Didit, cuyo callback no lleva el correo ni el colaborador.
     */
    if (!invitation) {
      return (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Abre esta página desde el enlace del correo de invitación. Si
              vienes de la verificación, regresa a la pestaña en la que la
              iniciaste.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Firma con biometría</CardTitle>
        </CardHeader>
        <CardContent>
          <GuestAccessCodeStep
            documentId={documentId}
            invitation={invitation}
            notice={notice}
            onVerified={(next) => {
              setNotice(null);
              save(next);
            }}
          />
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

  const session = sessionQuery.data ?? null;
  const signed = Boolean(session?.signatureCompleted);

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
          {document.canSign || session ? (
            <BiometricSignaturePanel
              session={session}
              isLoading={sessionQuery.isLoading}
              geoBlockedReason={geoBlockedReason}
              isRequestingLocation={geoStatus === 'requesting'}
              isStarting={start.isPending}
              onStart={() => void handleStart()}
              verificationScope="document"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Este documento no tiene una firma pendiente para ti en este
              momento.
            </p>
          )}
          {signed && (
            <p className="text-sm text-muted-foreground">
              {session?.documentCompleted
                ? 'El documento quedó firmado por todos. Puedes cerrar esta página.'
                : 'Avisaremos a los demás firmantes. Puedes cerrar esta página.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
