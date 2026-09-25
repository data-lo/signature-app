'use client';

import type { FormEventHandler } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import type { DocumentDetail } from '../_requests';
import type { DocumentLoadErrorKind } from '../_errors';
import type { ShareLinkStatus } from '../_hooks/useShareDocumentLink';
import AdvancedSignatureDialog, {
  type AdvancedSignatureSubmitValues,
} from './AdvancedSignatureDialog';
import CancellationConfirmDialog from './CancellationConfirmDialog';
import DocumentParticipantsCard from './DocumentParticipantsCard';
import DocumentApprovalActions from './DocumentApprovalActions';
import DocumentPreviewPanel from './DocumentPreviewPanel';
import DocumentSignaturePanel, {
  type DocumentSigningProps,
} from './DocumentSignaturePanel';
import DocumentStatusNotices from './DocumentStatusNotices';
import DocumentSummaryCard from './DocumentSummaryCard';
import RejectDocumentForm from './RejectDocumentForm';
import ShareDocumentLinkAction from './ShareDocumentLinkAction';
import SignatureRequiredDialog from './SignatureRequiredDialog';
import SignatureSuccessDialog from './SignatureSuccessDialog';
import type { SignatureVerificationProps } from './SignatureVerificationCard';

/**
 * Interruptor del botón "Solicitar cancelación". Apagado por decisión de producto: el botón no
 * se dibuja aunque el backend mande `canRequestCancellation` en true. El diálogo, el hook y el
 * endpoint siguen conectados, así que volver a mostrarlo es cambiar esta constante.
 * "Confirmar cancelación" no depende de ella: los documentos que ya estén en
 * `CANCELLATION_PENDING` se pueden seguir resolviendo.
 */
const IS_CANCELLATION_REQUEST_ENABLED = false;

export interface DocumentViewProps {
  /** Estados de la carga del detalle: la vista los dibuja, no los resuelve. */
  isLoading: boolean;
  /** Por qué falló la carga del detalle, o `null` si no falló. */
  loadError: DocumentLoadErrorKind | null;
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

  /** Acuse de la firma recién registrada; cerrado mientras no se haya firmado en esta visita. */
  signatureSuccessDialog: {
    open: boolean;
    documentCompleted: boolean;
    onClose: () => void;
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
  loadError,
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
  signatureSuccessDialog,
}: DocumentViewProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando documento...
      </div>
    );
  }

  /**
   * Sin permiso no es un fallo que se arregle esperando: se dice qué pasa y qué se puede hacer,
   * en vez del "Intenta de nuevo más tarde" que se mostraba para todo.
   */
  if (loadError === 'forbidden') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          No tienes permiso para ver este documento
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu rol no incluye la lectura de este documento en ninguna de tus
          cuentas. Si crees que deberías tener acceso, pídeselo a un
          administrador de su organización.
        </p>
      </div>
    );
  }

  if (loadError === 'not-found') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-destructive">
          El documento no existe o fue eliminado.
        </p>
      </div>
    );
  }

  if (loadError || !document) {
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

        {/*
          Va antes del panel de firma y no después porque, cuando aparece, es LO ÚNICO que se
          puede hacer con el documento: mientras espera aprobación `canSign` viene en false desde
          el backend, así que los dos bloques nunca compiten por la atención.
        */}
        <DocumentApprovalActions
          documentId={document.id}
          documentStatus={document.status}
          myRole={document.myRole}
          myStatus={document.myStatus}
        />

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

        {IS_CANCELLATION_REQUEST_ENABLED && document.canRequestCancellation && (
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

      <SignatureSuccessDialog
        open={signatureSuccessDialog.open}
        documentCompleted={signatureSuccessDialog.documentCompleted}
        onClose={signatureSuccessDialog.onClose}
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
