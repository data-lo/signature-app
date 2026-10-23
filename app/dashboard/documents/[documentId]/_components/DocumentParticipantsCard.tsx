import { ParticipantRole, ParticipantStatus } from '@/lib/enums/document';
import type { DocumentParticipant } from '../_requests';

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Pending]: 'Pendiente',
  [ParticipantStatus.Approved]: 'Aprobado',
  [ParticipantStatus.Signed]: 'Firmado',
  [ParticipantStatus.Rejected]: 'Rechazado',
  [ParticipantStatus.Notified]: 'Notificado',
};

const ROLE_LABELS: Record<ParticipantRole, string> = {
  [ParticipantRole.Signer]: 'Firmante',
  [ParticipantRole.Reviewer]: 'Revisor',
  [ParticipantRole.Witness]: 'Testigo',
  [ParticipantRole.Creator]: 'Creador',
};

const STATUS_CLASSES: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Signed]: 'text-emerald-600',
  // Aprobado comparte el verde de firmado: los dos significan "este participante ya cumplió".
  [ParticipantStatus.Approved]: 'text-emerald-600',
  [ParticipantStatus.Rejected]: 'text-red-600',
  [ParticipantStatus.Pending]: 'text-amber-600',
  [ParticipantStatus.Notified]: 'text-sky-600',
};

/** Iniciales para dar una referencia visual rápida sin depender de una foto de perfil. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

interface DocumentParticipantsCardProps {
  participants: DocumentParticipant[];
}

/** Quién participa en el documento, con su rol y en qué estatus va cada uno. */
export default function DocumentParticipantsCard({
  participants,
}: DocumentParticipantsCardProps) {
  return (
    <section aria-label="Participantes">
      <div className="divide-y divide-border">
        {participants.map((participant) => (
          <div
            key={participant.id}
            data-slot="participant"
            className="flex items-center gap-3 px-4 py-3"
          >
            <div
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
            >
              {initials(participant.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {participant.name}
                <span className="font-normal text-muted-foreground">
                  {' · '}
                  {ROLE_LABELS[participant.role]}
                </span>
              </p>
              {participant.cancellationReason && (
                <p className="mt-1 text-xs text-destructive">
                  {participant.cancellationReason}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                participant.status === ParticipantStatus.Pending
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                  : `bg-muted ${STATUS_CLASSES[participant.status]}`
              }`}
            >
              {STATUS_LABELS[participant.status]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
