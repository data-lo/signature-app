import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParticipantRole, ParticipantStatus } from '@/lib/enums/document';
import type { DocumentParticipant } from '../_requests';

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

const STATUS_CLASSES: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Signed]: 'text-emerald-600',
  [ParticipantStatus.Rejected]: 'text-red-600',
  [ParticipantStatus.Pending]: 'text-amber-600',
};

interface DocumentParticipantsCardProps {
  participants: DocumentParticipant[];
}

/** Quién participa en el documento, con su rol y en qué estatus va cada uno. */
export default function DocumentParticipantsCard({
  participants,
}: DocumentParticipantsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Participantes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {participant.name}
              </span>
              <span className={STATUS_CLASSES[participant.status]}>
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
  );
}
