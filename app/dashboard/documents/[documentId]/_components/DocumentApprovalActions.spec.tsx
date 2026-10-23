import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import {
  approveDocumentRequest,
  rejectDocumentApprovalRequest,
} from '../_requests';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
} from '@/lib/enums/document';
import DocumentApprovalActions from './DocumentApprovalActions';

jest.mock('../_requests');

const mockedApprove = approveDocumentRequest as jest.Mock;
const mockedReject = rejectDocumentApprovalRequest as jest.Mock;

function renderActions(
  overrides: Partial<React.ComponentProps<typeof DocumentApprovalActions>> = {},
) {
  return renderWithProviders(
    <DocumentApprovalActions
      documentId="doc-1"
      documentStatus={DocumentStatus.PendingApproval}
      myRole={ParticipantRole.Reviewer}
      myStatus={ParticipantStatus.Pending}
      {...overrides}
    />,
  );
}

/**
 * Historia "Implementar flujo de aprobación previo al proceso de firma": qué ve y qué puede hacer
 * el usuario aprobador.
 */
describe('DocumentApprovalActions', () => {
  beforeEach(() => {
    mockedApprove.mockReset().mockResolvedValue(undefined);
    mockedReject.mockReset().mockResolvedValue(undefined);
  });

  describe('cuándo se muestra', () => {
    it('al aprobador asignado, con el documento esperando y su decisión pendiente', () => {
      renderActions();

      expect(
        screen.getByRole('button', { name: /^aprobar$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^rechazar$/i }),
      ).toBeInTheDocument();
    });

    it('no se muestra a quien no es el aprobador asignado', () => {
      renderActions({ myRole: ParticipantRole.Signer });

      expect(
        screen.queryByRole('button', { name: /^aprobar$/i }),
      ).not.toBeInTheDocument();
    });

    it('no se muestra si el documento ya salió de la espera de aprobación', () => {
      renderActions({ documentStatus: DocumentStatus.PendingSignature });

      expect(
        screen.queryByRole('button', { name: /^aprobar$/i }),
      ).not.toBeInTheDocument();
    });

    /** Una decisión ya registrada no vuelve a ofrecerse. */
    it('no se muestra si el aprobador ya decidió', () => {
      renderActions({ myStatus: ParticipantStatus.Approved });

      expect(
        screen.queryByRole('button', { name: /^aprobar$/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('aprobar manda la decisión sin pedir nada más', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole('button', { name: /^aprobar$/i }));

    await waitFor(() => expect(mockedApprove).toHaveBeenCalledWith('doc-1'));
    expect(mockedReject).not.toHaveBeenCalled();
  });

  /**
   * Rechazar sí pide el motivo antes de confirmar: es lo único que el creador va a recibir para
   * entender qué corregir.
   */
  it('rechazar pide el motivo y lo manda con la decisión', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole('button', { name: /^rechazar$/i }));
    await user.type(
      screen.getByLabelText(/motivo del rechazo/i),
      'Falta el anexo B',
    );
    await user.click(
      screen.getByRole('button', { name: /confirmar rechazo/i }),
    );

    await waitFor(() =>
      expect(mockedReject).toHaveBeenCalledWith('doc-1', 'Falta el anexo B'),
    );
  });

  it('el motivo es opcional: se puede rechazar sin escribir nada', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole('button', { name: /^rechazar$/i }));
    await user.click(
      screen.getByRole('button', { name: /confirmar rechazo/i }),
    );

    await waitFor(() => expect(mockedReject).toHaveBeenCalledWith('doc-1', ''));
  });

  it('se puede volver atrás sin registrar el rechazo', async () => {
    const user = userEvent.setup();
    renderActions();

    await user.click(screen.getByRole('button', { name: /^rechazar$/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(
      screen.getByRole('button', { name: /^aprobar$/i }),
    ).toBeInTheDocument();
    expect(mockedReject).not.toHaveBeenCalled();
  });
});
