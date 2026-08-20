import { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';

const MY_STATUS_MESSAGES: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Signed]: 'Ya firmaste este documento.',
  [ParticipantStatus.Rejected]: 'Ya rechazaste este documento.',
  [ParticipantStatus.Pending]: 'Aún no es tu turno para firmar este documento.',
};

interface DocumentStatusNoticesProps {
  documentStatus: DocumentStatus;
  /** Estatus del usuario dentro del documento; null si no participa (p. ej. el creador). */
  myStatus: ParticipantStatus | null;
  canSign: boolean;
  canConfirmCancellation: boolean;
}

/** Avisos de solo lectura sobre en qué punto está el documento para este usuario. */
export default function DocumentStatusNotices({
  documentStatus,
  myStatus,
  canSign,
  canConfirmCancellation,
}: DocumentStatusNoticesProps) {
  return (
    <>
      {!canSign && myStatus && (
        <p className="text-sm text-muted-foreground">
          {MY_STATUS_MESSAGES[myStatus]}
        </p>
      )}

      {documentStatus === DocumentStatus.CancellationPending &&
        !canConfirmCancellation && (
          <p className="text-sm text-muted-foreground">
            Se solicitó la cancelación de este documento. Está pendiente de
            confirmación por los firmantes.
          </p>
        )}

      {documentStatus === DocumentStatus.Cancelled && (
        <p className="text-sm text-muted-foreground">
          Este documento fue cancelado.
        </p>
      )}
    </>
  );
}
