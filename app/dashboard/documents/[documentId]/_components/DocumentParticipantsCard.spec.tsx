import { renderWithProviders, screen, within } from '@/test-utils';
import DocumentParticipantsCard from './DocumentParticipantsCard';
import type { DocumentParticipant } from '../_requests';
import { ParticipantRole, ParticipantStatus } from '@/lib/enums/document';

function buildParticipant(
  overrides: Partial<DocumentParticipant> = {},
): DocumentParticipant {
  return {
    id: 'part-1',
    userId: null,
    email: 'persona@correo.com',
    name: 'Persona Uno',
    role: ParticipantRole.Signer,
    status: ParticipantStatus.Pending,
    cancellationReason: null,
    ...overrides,
  };
}

/** Fila del participante con ese nombre: su estatus y su rol viven dentro de ella. */
function participantRow(name: string): HTMLElement {
  return screen.getByText(name).closest('div.flex-col') as HTMLElement;
}

/**
 * Historia "Actualizar estado de testigo a 'Notificado' al consultar el documento": la tarjeta
 * pinta el estatus que manda el backend, sin deducirlo.
 */
describe('DocumentParticipantsCard', () => {
  it('muestra "Pendiente" para un testigo que todavía no fue notificado', () => {
    renderWithProviders(
      <DocumentParticipantsCard
        participants={[
          buildParticipant({
            name: 'Testigo Uno',
            role: ParticipantRole.Witness,
            status: ParticipantStatus.Pending,
          }),
        ]}
      />,
    );

    const row = participantRow('Testigo Uno');
    expect(within(row).getByText('Pendiente')).toBeInTheDocument();
    expect(within(row).getByText('Testigo')).toBeInTheDocument();
  });

  it('muestra "Notificado" para un testigo al que ya se le envió el aviso', () => {
    renderWithProviders(
      <DocumentParticipantsCard
        participants={[
          buildParticipant({
            name: 'Testigo Uno',
            role: ParticipantRole.Witness,
            status: ParticipantStatus.Notified,
          }),
        ]}
      />,
    );

    const row = participantRow('Testigo Uno');
    expect(within(row).getByText('Notificado')).toBeInTheDocument();
    expect(within(row).queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('no cambia el estatus de firmantes ni aprobadores junto al testigo notificado', () => {
    renderWithProviders(
      <DocumentParticipantsCard
        participants={[
          buildParticipant({
            id: 'signer-1',
            name: 'Firmante Uno',
            role: ParticipantRole.Signer,
            status: ParticipantStatus.Pending,
          }),
          buildParticipant({
            id: 'reviewer-1',
            name: 'Aprobador Uno',
            role: ParticipantRole.Reviewer,
            status: ParticipantStatus.Approved,
          }),
          buildParticipant({
            id: 'witness-1',
            name: 'Testigo Uno',
            role: ParticipantRole.Witness,
            status: ParticipantStatus.Notified,
          }),
        ]}
      />,
    );

    expect(
      within(participantRow('Firmante Uno')).getByText('Pendiente'),
    ).toBeInTheDocument();
    expect(
      within(participantRow('Aprobador Uno')).getByText('Aprobado'),
    ).toBeInTheDocument();
    expect(
      within(participantRow('Testigo Uno')).getByText('Notificado'),
    ).toBeInTheDocument();
  });
});
