'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ParticipantRole } from '@/lib/enums/document';
import { useDocumentDetail } from '../[documentId]/_hooks/useDocumentDetail';
import type { DocumentParticipant } from '../[documentId]/_requests';

interface DocumentParticipantsDialogProps {
  /** Documento a consultar; `null` mantiene el diálogo cerrado y no dispara la consulta. */
  documentId: string | null;
  fileName?: string;
  onOpenChange: (open: boolean) => void;
}

/** Una persona del documento: solo nombre y correo, que es lo que esta consulta responde. */
function ParticipantRow({ participant }: { participant: DocumentParticipant }) {
  return (
    <li className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="font-medium text-foreground">{participant.name}</span>
      <span className="text-xs text-muted-foreground">{participant.email}</span>
    </li>
  );
}

function ParticipantsSection({
  title,
  participants,
}: {
  title: string;
  participants: DocumentParticipant[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {participants.map((participant) => (
          <ParticipantRow key={participant.id} participant={participant} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Acción "Ver participantes" de la tabla de documentos: quiénes están involucrados en el
 * documento, agrupados por su rol.
 *
 * Los datos salen del detalle del documento (`GET /document/:id`, el mismo que alimenta la
 * pantalla de firma) porque es el único que trae el correo de cada colaborador; el listado solo
 * devuelve nombres. La consulta se dispara al abrir —`enabled`— y react-query la comparte con la
 * pantalla de detalle, así que consultar dos veces el mismo documento no vuelve a pegarle a la
 * API.
 */
export default function DocumentParticipantsDialog({
  documentId,
  fileName,
  onOpenChange,
}: DocumentParticipantsDialogProps) {
  const { data, isLoading, isError } = useDocumentDetail(documentId ?? '', {
    enabled: documentId != null,
  });

  const participants = data?.participants ?? [];
  const signers = participants.filter(
    (participant) => participant.role === ParticipantRole.Signer,
  );
  /**
   * Observadores son los `watcher` —los "espectadores" del formulario de creación—, únicos
   * participantes sin acción sobre el documento. Un revisor no entra acá: tiene su propio rol y
   * esta consulta no lo contempla.
   */
  const watchers = participants.filter(
    (participant) => participant.role === ParticipantRole.Watcher,
  );

  return (
    <Dialog open={documentId != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participantes</DialogTitle>
          <DialogDescription>
            Personas involucradas en
            {fileName ? ` “${fileName}”` : ' este documento'}.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          // `role="status"` para que la espera se anuncie: el modal se abre vacío y lo único
          // que hay mientras llega el detalle son los esqueletos.
          <div
            role="status"
            aria-label="Cargando participantes"
            className="flex flex-col gap-2"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            No se pudieron cargar los participantes de este documento.
          </p>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            {/* Firmantes se muestra siempre: es la razón de ser del documento. Observadores solo
              si hay alguno — un documento sin observadores no dice "no hay observadores", no
              muestra nada. */}
            <ParticipantsSection title="Firmantes" participants={signers} />
            {watchers.length > 0 && (
              <ParticipantsSection
                title="Observadores"
                participants={watchers}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
