'use client';

import { useState } from 'react';
import { BadgeCheck, LockKeyhole, PenLine, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import { SignatureCaptureChannel } from '@/lib/api/signature-capture';
import {
  useCreateSignatureCaptureSession,
  useSaveHandwrittenSignature,
} from '@/lib/hooks/useSignatureCapture';
import SignatureDrawer from '@/components/signature/SignatureDrawer';
import { SIGNATURE_DOCUMENT } from '../../_config/personal-documents.config';
import PersonalDocumentCard from '../../_components/PersonalDocumentCard';
import DeleteConfirmDialog from '../../_components/DeleteConfirmDialog';
import { useDeleteSignatureImage } from '../_hooks/useDeleteSignatureImage';
import MobileHandoffPanel from './MobileHandoffPanel';

interface SignatureCardProps {
  status: SigningCredentialStatus;
}

/**
 * La firma ya registrada se anuncia como tal: la tarjeta de documento personal es la misma que
 * en el resto de la sección, sólo cambia el encabezado para que se lea como una confirmación y
 * no como un pendiente.
 */
const REGISTERED_SIGNATURE_CONFIG = {
  ...SIGNATURE_DOCUMENT,
  label: 'Tu firma ha sido agregada',
};

/**
 * Paso 2: la rúbrica.
 *
 * **La firma se dibuja, ya no se sube.** El selector de archivo PNG se retiró de la interfaz: el
 * usuario traza su rúbrica en un canvas, aquí o en su celular escaneando un QR. El endpoint de
 * carga sigue existiendo en el backend, así que nada se rompe — sólo dejó de haber dos caminos
 * que explicar para lo mismo.
 *
 * La tarjeta se muestra siempre antes de que la firma esté disponible, para indicar qué falta
 * completar sin repetir el estado de la verificación.
 *
 * El bloqueo acá es de interfaz, no de seguridad: quien fuerce la petición se topa con el 403
 * del backend, que valida el mismo estado contra la base de datos.
 */
export default function SignatureCard({ status }: SignatureCardProps) {
  if (status === SigningCredentialStatus.Configured) {
    return <RegisteredSignature />;
  }

  if (status === SigningCredentialStatus.SignaturePending) {
    return <SignatureCapture />;
  }

  return <LockedSignature />;
}

function LockedSignature() {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <LockKeyhole className="size-5" />
          Firma · bloqueada
        </CardTitle>
        <CardDescription>
          Podrás registrar tu firma cuando se apruebe tu identidad.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * Captura de la rúbrica: dibujarla aquí, o pasar el flujo al celular con un QR.
 *
 * Los dos caminos terminan en el mismo sitio —una sesión de captura y un PNG— así que el estado
 * que gobierna la pantalla es cuál de los dos está abierto, no dos flujos separados.
 *
 * Sólo se llega acá SIN firma registrada. Antes esta misma pantalla servía además para
 * reemplazar una existente, y por eso su título cambiaba; ese camino se retiró (ver
 * `RegisteredSignature`).
 */
function SignatureCapture() {
  const [mode, setMode] = useState<'idle' | 'draw' | 'mobile'>('idle');

  const createSession = useCreateSignatureCaptureSession();
  const saveSignature = useSaveHandwrittenSignature();

  /**
   * Dibujar en esta misma computadora también abre una sesión de captura, por el canal DESKTOP:
   * así los dos caminos comparten endpoint, validaciones y manejo de errores en vez de que el
   * de escritorio use el alta de archivo por su cuenta.
   */
  function handleDraw() {
    setMode('draw');
    createSession.mutate(SignatureCaptureChannel.Desktop);
  }

  function handleMobile() {
    setMode('mobile');
    createSession.mutate(SignatureCaptureChannel.MobileQr);
  }

  const session = createSession.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-5 text-primary" />
          Registra tu firma
        </CardTitle>
        <CardDescription>
          Dibújala aquí mismo o continúa en tu celular, donde es más cómodo
          trazarla con el dedo.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={handleDraw}
              disabled={createSession.isPending}
            >
              <PenLine className="size-4" aria-hidden />
              Dibujar aquí
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleMobile}
              disabled={createSession.isPending}
            >
              <Smartphone className="size-4" aria-hidden />
              Firmar desde mi celular
            </Button>
          </div>
        )}

        {mode === 'draw' && session && (
          <SignatureDrawer
            saving={saveSignature.isPending}
            onCancel={() => setMode('idle')}
            onSave={(png) =>
              saveSignature.mutate({ sessionId: session.id, png })
            }
          />
        )}

        {mode === 'mobile' && session && (
          <MobileHandoffPanel
            session={session}
            onDone={() => setMode('idle')}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Firma ya registrada: se ve y se elimina. Nada más.
 *
 * **Mientras haya una firma guardada, eliminarla es la única acción.** Acá convivía un botón
 * «Dibujar una firma nueva» que abría la captura encima de la firma existente, con un «Conservar
 * mi firma actual» para deshacer. Eran dos maneras de llegar al mismo sitio y obligaban a
 * explicar la diferencia entre reemplazar y eliminar; ahora para registrar otra rúbrica primero
 * se borra la actual, que es lo que ya hacían el INE y el resto de los documentos personales
 * (ver `PersonalDocumentCard`, que oculta su selector de archivo en cuanto el documento existe).
 *
 * Al eliminar, la credencial vuelve a SIGNATURE_PENDING y `SignatureCard` monta de nuevo
 * `SignatureCapture` con sus dos opciones. Por eso no hace falta ningún estado local para
 * "volver a capturar": lo gobierna el estado de la credencial, que es la fuente de verdad.
 */
function RegisteredSignature() {
  const { data: user } = useCurrentUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteSignatureImage();

  const signature = user?.signature ?? null;

  return (
    <>
      <PersonalDocumentCard
        config={REGISTERED_SIGNATURE_CONFIG}
        storedUrl={signature?.secureUrl ?? null}
        storedTitleIcon={
          <BadgeCheck
            className="size-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        }
        showOpen={false}
        deleteVariant="destructive"
        deleting={deleteMutation.isPending}
        onDelete={signature ? () => setConfirmingDelete(true) : undefined}
      />

      <DeleteConfirmDialog
        open={confirmingDelete}
        label={SIGNATURE_DOCUMENT.possessiveName}
        onOpenChange={(open) => !open && setConfirmingDelete(false)}
        onConfirm={() =>
          signature &&
          deleteMutation.mutate(signature.id, {
            onSuccess: () => setConfirmingDelete(false),
          })
        }
        confirming={deleteMutation.isPending}
      />
    </>
  );
}
