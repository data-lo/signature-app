import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  getDocumentApproversRequest,
  type DocumentApprover,
} from '../_requests';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import ApproverUserField, {
  APPROVERS_ERROR_MESSAGE,
  APPROVERS_FORBIDDEN_MESSAGE,
  NO_APPROVERS_MESSAGE,
} from './ApproverUserField';

jest.mock('../_requests', () => ({
  ...jest.requireActual('../_requests'),
  getDocumentApproversRequest: jest.fn(),
}));

const mockedGetApprovers = getDocumentApproversRequest as jest.Mock;

function approver(overrides: Partial<DocumentApprover> = {}): DocumentApprover {
  return {
    userId: 'user-1',
    email: 'ana@empresa.com',
    firstName: 'Ana',
    lastName: 'Ruiz',
    ...overrides,
  };
}

function httpError(status: number) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status, data: {} } as AxiosResponse,
  );
}

/** El valor que el formulario prepara para el envío, visible para poder afirmar sobre él. */
function ReviewerUserIdOutput({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const reviewerUserId = useWatch({ control, name: 'reviewerUserId' });

  return <output>{reviewerUserId ?? 'sin aprobador'}</output>;
}

function Harness({ requiresApproval = true }: { requiresApproval?: boolean }) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: {
      requiresApproval,
      reviewerUserId: null,
      includeMeAsSigner: false,
      requiresOrder: false,
      collaborators: [],
    },
  });

  return (
    <>
      <ApproverUserField control={control} />
      <ReviewerUserIdOutput control={control} />
    </>
  );
}

describe('ApproverUserField', () => {
  beforeEach(() => {
    mockedGetApprovers.mockReset();
    useAuthStore.setState({
      activeAccount: {
        id: 'account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'role-1',
      },
    });
  });

  it('con "Requiere aprobación" desactivado no consulta nada ni muestra selector', async () => {
    renderWithProviders(<Harness requiresApproval={false} />);

    await waitFor(() =>
      expect(screen.getByText('sin aprobador')).toBeInTheDocument(),
    );
    expect(mockedGetApprovers).not.toHaveBeenCalled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(NO_APPROVERS_MESSAGE)).not.toBeInTheDocument();
  });

  /**
   * Historia "Corregir carga de aprobadores al requerir aprobación durante la creación de
   * documentos": la lista sale de `GET /documents/approvers` (permiso de crear documentos) y no
   * del listado de miembros (permiso de ver miembros), que dejaba sin aprobadores a quien sólo
   * podía crear.
   */
  it('con la opción activa consulta los aprobadores del endpoint de documentos', async () => {
    mockedGetApprovers.mockResolvedValue([approver()]);

    renderWithProviders(<Harness />);

    await waitFor(() => expect(mockedGetApprovers).toHaveBeenCalledTimes(1));
  });

  it('muestra un estado de carga mientras llegan los aprobadores', async () => {
    mockedGetApprovers.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Harness />);

    expect(
      await screen.findByText('Cargando usuarios aprobadores...'),
    ).toBeInTheDocument();
  });

  it('lista a cada aprobador con su nombre y su correo', async () => {
    const user = userEvent.setup();
    mockedGetApprovers.mockResolvedValue([
      approver(),
      approver({
        userId: 'user-2',
        email: 'beto@empresa.com',
        firstName: '',
        lastName: '',
      }),
    ]);

    renderWithProviders(<Harness />);
    const combobox = await screen.findByRole('combobox', {
      name: /usuario aprobador/i,
    });

    combobox.focus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('option', { name: 'Ana Ruiz (ana@empresa.com)' }),
    ).toBeInTheDocument();
    // Sin nombre registrado, sólo el correo.
    expect(
      screen.getByRole('option', { name: 'beto@empresa.com' }),
    ).toBeInTheDocument();
  });

  it('sin usuarios aprobadores muestra el mensaje de la historia y ningún selector', async () => {
    mockedGetApprovers.mockResolvedValue([]);

    renderWithProviders(<Harness />);

    expect(await screen.findByText(NO_APPROVERS_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('al elegir un aprobador, el formulario prepara su userId', async () => {
    const user = userEvent.setup();
    mockedGetApprovers.mockResolvedValue([approver()]);

    renderWithProviders(<Harness />);
    const combobox = await screen.findByRole('combobox', {
      name: /usuario aprobador/i,
    });

    expect(screen.getByText('sin aprobador')).toBeInTheDocument();
    combobox.focus();
    await user.keyboard('{Enter}');
    await user.click(
      await screen.findByRole('option', { name: /ana@empresa\.com/i }),
    );

    expect(await screen.findByText('user-1')).toBeInTheDocument();
  });

  it('sin permiso para crear documentos (403) lo dice, sin reintentar ni ofrecer reintento', async () => {
    mockedGetApprovers.mockRejectedValue(httpError(403));

    renderWithProviders(<Harness />);

    expect(
      await screen.findByText(APPROVERS_FORBIDDEN_MESSAGE),
    ).toBeInTheDocument();
    expect(mockedGetApprovers).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: /reintentar/i }),
    ).not.toBeInTheDocument();
  });

  it('si la consulta falla por otra causa, lo dice y permite reintentar', async () => {
    const user = userEvent.setup();
    mockedGetApprovers.mockRejectedValue(httpError(400));

    renderWithProviders(<Harness />);

    expect(
      await screen.findByText(APPROVERS_ERROR_MESSAGE),
    ).toBeInTheDocument();
    expect(screen.queryByText(NO_APPROVERS_MESSAGE)).not.toBeInTheDocument();

    mockedGetApprovers.mockResolvedValue([approver()]);
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(
      await screen.findByRole('combobox', { name: /usuario aprobador/i }),
    ).toBeInTheDocument();
  });
});
