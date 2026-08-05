'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
  SignatureType,
} from '@/lib/enums/document';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useDocumentFileUrl } from '../../_hooks/useDocumentFileUrl';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { useRequestCancellation } from '../_hooks/useRequestCancellation';
import { useConfirmCancellation } from '../_hooks/useConfirmCancellation';
import { useRequestVerificationCode } from '../_hooks/useRequestVerificationCode';
import { useVerifyCode } from '../_hooks/useVerifyCode';
import {
  rejectDocumentSchema,
  type RejectDocumentFormValues,
} from '../_schemas';
import CancellationConfirmDialog from './CancellationConfirmDialog';

const PdfPreview = dynamic(() => import('../../_components/PdfPreview'), {
  ssr: false,
});

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Pending]: 'Pendiente',
  [ParticipantStatus.Signed]: 'Firmado',
  [ParticipantStatus.Rejected]: 'Rechazado',
};

const ROLE_LABELS: Record<ParticipantRole, string> = {
  [ParticipantRole.Signer]: 'Firmante',
  [ParticipantRole.Reviewer]: 'Revisor',
  [ParticipantRole.Watcher]: 'Espectador',
  [ParticipantRole.Creator]: 'Creador',
};

interface SignDocumentViewProps {
  documentId: string;
}

export default function SignDocumentView({
  documentId,
}: SignDocumentViewProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showConfirmCancellationDialog, setShowConfirmCancellationDialog] =
    useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [showSignatureRequiredDialog, setShowSignatureRequiredDialog] =
    useState(false);
  const user = useAuthStore((state) => state.user);
  const { data: document, isLoading, isError } = useDocumentDetail(documentId);
  const {
    data: fileUrl,
    isLoading: isFileUrlLoading,
    isError: isFileUrlError,
    isFetching: isFileUrlFetching,
    refetch: refetchFileUrl,
  } = useDocumentFileUrl(documentId);
  const signMutation = useSignDocument(documentId);
  const rejectMutation = useRejectDocument(documentId);
  const requestCancellationMutation = useRequestCancellation(documentId);
  const confirmCancellationMutation = useConfirmCancellation(documentId);
  const requestVerificationCodeMutation =
    useRequestVerificationCode(documentId);
  const verifyCodeMutation = useVerifyCode(documentId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectDocumentFormValues>({
    resolver: zodResolver(rejectDocumentSchema),
  });

  function onReject(values: RejectDocumentFormValues) {
    rejectMutation.mutate(values.reason);
  }

  const needsSimpleSignatureSetup =
    document?.mySignatureType === SignatureType.Simple &&
    !user?.signatureConfigured;

  // Alcance: solo firma simple. Bloquea también la lectura del documento (no solo
  // los botones de firma) porque el usuario puede llegar por URL directa (ej.
  // /documents/:id) sin haber pasado antes por una pantalla que ya lo avisara.
  useEffect(() => {
    if (needsSimpleSignatureSetup) {
      setShowSignatureRequiredDialog(true);
    }
  }, [needsSimpleSignatureSetup]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando documento...
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-destructive">
          No se pudo cargar el documento. Intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

  return (
    <PageContainer className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{document.fileName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              Solicitado por{' '}
              <span className="font-medium text-foreground">
                {document.creator}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Participantes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {document.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {participant.name}
                  </span>
                  <span
                    className={
                      participant.status === ParticipantStatus.Signed
                        ? 'text-emerald-600'
                        : participant.status === ParticipantStatus.Rejected
                          ? 'text-red-600'
                          : 'text-amber-600'
                    }
                  >
                    {STATUS_LABELS[participant.status]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[participant.role]}
                </span>
                {participant.cancellationReason && (
                  <p className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                    {participant.cancellationReason}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {document.canSign && !showRejectForm && (
          <div className="flex flex-col gap-2">
            {needsSimpleSignatureSetup && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Para firmar documentos con tu firma digital simple, esta debe
                estar configurada.
              </div>
            )}

            <div
              inert={needsSimpleSignatureSetup}
              aria-disabled={needsSimpleSignatureSetup}
              className={
                needsSimpleSignatureSetup
                  ? 'pointer-events-none flex flex-col gap-2 opacity-50 select-none'
                  : 'flex flex-col gap-2'
              }
            >
              {document.requiresVerification &&
                !document.verificationConfirmed && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                    <p className="text-sm font-medium text-foreground">
                      Este documento requiere verificación
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Solicita y valida tu código antes de firmar.
                    </p>
                    {!codeRequested ? (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={requestVerificationCodeMutation.isPending}
                        onClick={() =>
                          requestVerificationCodeMutation.mutate(undefined, {
                            onSuccess: () => setCodeRequested(true),
                          })
                        }
                      >
                        {requestVerificationCodeMutation.isPending
                          ? 'Enviando código...'
                          : 'Solicitar código de verificación'}
                      </Button>
                    ) : (
                      <>
                        <Input
                          inputMode="numeric"
                          placeholder="Código de verificación"
                          value={verificationCodeInput}
                          onChange={(e) =>
                            setVerificationCodeInput(e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          className="w-full"
                          disabled={
                            verifyCodeMutation.isPending ||
                            !verificationCodeInput
                          }
                          onClick={() =>
                            verifyCodeMutation.mutate(verificationCodeInput, {
                              onSuccess: () => setVerificationCodeInput(''),
                            })
                          }
                        >
                          {verifyCodeMutation.isPending
                            ? 'Verificando...'
                            : 'Verificar código'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={requestVerificationCodeMutation.isPending}
                          onClick={() =>
                            requestVerificationCodeMutation.mutate()
                          }
                        >
                          Reenviar código
                        </Button>
                      </>
                    )}
                  </div>
                )}

              {(!document.requiresVerification ||
                document.verificationConfirmed) && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={signMutation.isPending}
                    onClick={() => signMutation.mutate()}
                  >
                    {signMutation.isPending
                      ? 'Firmando...'
                      : 'Continuar a firmar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowRejectForm(true)}
                  >
                    Rechazar documento
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {document.canReject && showRejectForm && (
          <form
            onSubmit={handleSubmit(onReject)}
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <p className="text-sm font-medium text-foreground">
              ¿Cuál es el problema con el documento?
            </p>
            <Textarea
              placeholder="Explica detalladamente por qué rechazas este documento."
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {!document.canSign && document.myStatus && (
          <p className="text-sm text-muted-foreground">
            {document.myStatus === ParticipantStatus.Signed
              ? 'Ya firmaste este documento.'
              : document.myStatus === ParticipantStatus.Rejected
                ? 'Ya rechazaste este documento.'
                : 'Aún no es tu turno para firmar este documento.'}
          </p>
        )}

        {document.canRequestCancellation && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowCancellationDialog(true)}
          >
            Solicitar cancelación
          </Button>
        )}

        {document.canConfirmCancellation && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowConfirmCancellationDialog(true)}
          >
            Confirmar cancelación
          </Button>
        )}

        {document.status === DocumentStatus.CancellationPending &&
          !document.canConfirmCancellation && (
            <p className="text-sm text-muted-foreground">
              Se solicitó la cancelación de este documento. Está pendiente de
              confirmación por los firmantes.
            </p>
          )}

        {document.status === DocumentStatus.Cancelled && (
          <p className="text-sm text-muted-foreground">
            Este documento fue cancelado.
          </p>
        )}
      </div>

      <div className="relative h-[75vh]">
        <Card className="h-full overflow-hidden p-0">
          <CardContent className="h-full p-0">
            {isFileUrlLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando documento...
              </div>
            ) : isFileUrlError || !fileUrl ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-destructive">
                  No se pudo cargar el archivo del documento.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFileUrlFetching}
                  onClick={() => refetchFileUrl()}
                >
                  {isFileUrlFetching ? 'Reintentando...' : 'Reintentar'}
                </Button>
              </div>
            ) : (
              <PdfPreview file={fileUrl.secureUrl} />
            )}
          </CardContent>
        </Card>

        {needsSimpleSignatureSetup && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
            <p className="max-w-xs rounded-lg bg-popover px-4 py-3 text-center text-sm font-medium text-popover-foreground shadow-sm ring-1 ring-foreground/10">
              Tu firma no ha sido configurada. Por favor confígurala para
              continuar.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={showSignatureRequiredDialog}
        onOpenChange={setShowSignatureRequiredDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma no configurada</DialogTitle>
            <DialogDescription>
              Tu firma no ha sido configurada. Por favor confígurala para
              continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              nativeButton={false}
              render={
                <Link href="/dashboard/personal-documents#signature-documents" />
              }
            >
              Configurar firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancellationConfirmDialog
        open={showCancellationDialog}
        title="¿Solicitar cancelación del documento?"
        description="Se notificará a todos los firmantes. El documento quedará pendiente de su confirmación."
        confirmLabel="Solicitar cancelación"
        onOpenChange={setShowCancellationDialog}
        onConfirm={() =>
          requestCancellationMutation.mutate(undefined, {
            onSuccess: () => setShowCancellationDialog(false),
          })
        }
        confirming={requestCancellationMutation.isPending}
      />

      <CancellationConfirmDialog
        open={showConfirmCancellationDialog}
        title="¿Confirmar la cancelación del documento?"
        description="Esta acción no se puede deshacer. El documento se marcará como cancelado para todos los participantes."
        confirmLabel="Confirmar cancelación"
        onOpenChange={setShowConfirmCancellationDialog}
        onConfirm={() =>
          confirmCancellationMutation.mutate(undefined, {
            onSuccess: () => setShowConfirmCancellationDialog(false),
          })
        }
        confirming={confirmCancellationMutation.isPending}
      />
    </PageContainer>
  );
}
