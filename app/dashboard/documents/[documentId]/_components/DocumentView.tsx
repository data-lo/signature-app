'use client';

import type { FormEventHandler } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import type { DocumentDetail } from '../_requests';
import type { ShareLinkStatus } from '../_hooks/useShareDocumentLink';
import AdvancedSignatureDialog, {
  type AdvancedSignatureSubmitValues,
} from './AdvancedSignatureDialog';
import CancellationConfirmDialog from './CancellationConfirmDialog';
import DocumentParticipantsCard from './DocumentParticipantsCard';
import DocumentPreviewPanel from './DocumentPreviewPanel';
import DocumentSignaturePanel, {
  type DocumentSigningProps,
} from './DocumentSignaturePanel';
import DocumentStatusNotices from './DocumentStatusNotices';
import DocumentSummaryCard from './DocumentSummaryCard';
import RejectDocumentForm from './RejectDocumentForm';
import ShareDocumentLinkAction from './ShareDocumentLinkAction';
import SignatureRequiredDialog from './SignatureRequiredDialog';
import type { SignatureVerificationProps } from './SignatureVerificationCard';

export interface DocumentViewProps {
  /** Estados de la carga del detalle: la vista los dibuja, no los resuelve. */
  isLoading: boolean;
  isError: boolean;
  document: DocumentDetail | null;

  /** Archivo del documento (endpoint aparte del detalle). */
  file: {
    url: string | null;
    isLoading: boolean;
    isError: boolean;
    isRetrying: boolean;
    onRetry: () => void;
  };

  needsSimpleSignatureSetup: boolean;
  signing: DocumentSigningProps;
  verification: SignatureVerificationProps;

  reject: {
    isFormOpen: boolean;
    reasonField: UseFormRegisterReturn;
    errorMessage?: string;
    isRejecting: boolean;
    onOpenForm: () => void;
    onCancelForm: () => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
  };

  share: {
    status: ShareLinkStatus;
    publicUrl: string | null;
    onShare: () => void;
    onDismissFallback: () => void;
  };

  cancellation: {
    isRequestDialogOpen: boolean;
    isConfirmDialogOpen: boolean;
    isRequesting: boolean;
    isConfirming: boolean;
    onOpenRequestDialog: (open: boolean) => void;
    onOpenConfirmDialog: (open: boolean) => void;
    onRequest: () => void;
    onConfirm: () => void;
  };

  signatureRequiredDialog: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

  advancedSignatureDialog: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AdvancedSignatureSubmitValues) => void;
    isConfirming: boolean;
  };
}

/**
 * Composición visual del detalle de un documento: qué se dibuja y en qué orden, nada más.
 *
 * No obtiene datos, no declara estado ni decide reglas de negocio — todo eso vive en
 * `DocumentViewSection`, que le pasa datos y callbacks por props. Las piezas de la izquierda
 * (resumen, participantes, acciones) y la derecha (visor) son componentes individuales.
 */
export default function DocumentView({
  isLoading,
  isError,
  document,
  file,
  needsSimpleSignatureSetup,
  signing,
  verification,
  reject,
  share,
  cancellation,
  signatureRequiredDialog,
  advancedSignatureDialog,
}: DocumentViewProps) {
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
        <DocumentSummaryCard
          fileName={document.fileName}
          creator={document.creator}
        />

        <DocumentParticipantsCard participants={document.participants} />

        {document.canSign && !reject.isFormOpen && (
          <DocumentSignaturePanel
            needsSimpleSignatureSetup={needsSimpleSignatureSetup}
            requiresVerification={
              document.requiresVerification && !document.verificationConfirmed
            }
            canReject={document.canReject}
            verification={verification}
            signing={signing}
            onRejectClick={reject.onOpenForm}
          />
        )}

        {document.canReject && reject.isFormOpen && (
          <RejectDocumentForm
            reasonField={reject.reasonField}
            errorMessage={reject.errorMessage}
            isRejecting={reject.isRejecting}
            onSubmit={reject.onSubmit}
            onCancel={reject.onCancelForm}
          />
        )}

        <DocumentStatusNotices
          documentStatus={document.status}
          myStatus={document.myStatus}
          canSign={document.canSign}
          canConfirmCancellation={document.canConfirmCancellation}
        />

        {document.canRequestCancellation && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => cancellation.onOpenRequestDialog(true)}
          >
            Solicitar cancelación
          </Button>
        )}

        {document.canConfirmCancellation && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => cancellation.onOpenConfirmDialog(true)}
          >
            Confirmar cancelación
          </Button>
        )}

        <ShareDocumentLinkAction
          status={share.status}
          publicUrl={share.publicUrl}
          onShare={share.onShare}
          onDismissFallback={share.onDismissFallback}
        />
      </div>

      <DocumentPreviewPanel
        fileUrl={file.url}
        isLoading={file.isLoading}
        isError={file.isError}
        isRetrying={file.isRetrying}
        onRetry={file.onRetry}
        isBlocked={needsSimpleSignatureSetup}
      />

      <SignatureRequiredDialog
        open={signatureRequiredDialog.open}
        onOpenChange={signatureRequiredDialog.onOpenChange}
      />

      <AdvancedSignatureDialog
        open={advancedSignatureDialog.open}
        onOpenChange={advancedSignatureDialog.onOpenChange}
        onSubmit={advancedSignatureDialog.onSubmit}
        confirming={advancedSignatureDialog.isConfirming}
      />

      <CancellationConfirmDialog
        open={cancellation.isRequestDialogOpen}
        title="¿Solicitar cancelación del documento?"
        description="Se notificará a todos los firmantes. El documento quedará pendiente de su confirmación."
        confirmLabel="Solicitar cancelación"
        onOpenChange={cancellation.onOpenRequestDialog}
        onConfirm={cancellation.onRequest}
        confirming={cancellation.isRequesting}
      />

      <CancellationConfirmDialog
        open={cancellation.isConfirmDialogOpen}
        title="¿Confirmar la cancelación del documento?"
        description="Esta acción no se puede deshacer. El documento se marcará como cancelado para todos los participantes."
        confirmLabel="Confirmar cancelación"
        onOpenChange={cancellation.onOpenConfirmDialog}
        onConfirm={cancellation.onConfirm}
        confirming={cancellation.isConfirming}
      />
    </PageContainer>
  );
}
