import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import JoinView from './JoinView';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useInvitationPreview } from '../_hooks/useInvitationPreview';
import { useCheckRfc } from '../_hooks/useCheckRfc';
import { useAcceptInvitation } from '../_hooks/useAcceptInvitation';
import { getAuthToken } from '@/lib/cookies';
import { getAccountsCatalogRequest } from '@/lib/api/accounts';
import type { InvitationPreview } from '@/lib/api/organization-invitations';

jest.mock('../_hooks/useInvitationPreview');
jest.mock('../_hooks/useCheckRfc');
jest.mock('../_hooks/useAcceptInvitation');
jest.mock('@/lib/cookies');
jest.mock('@/lib/api/accounts');

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const mockedUseInvitationPreview = useInvitationPreview as jest.Mock;
const mockedUseCheckRfc = useCheckRfc as jest.Mock;
const mockedUseAcceptInvitation = useAcceptInvitation as jest.Mock;
const mockedGetAuthToken = getAuthToken as jest.Mock;
const mockedGetAccountsCatalogRequest = getAccountsCatalogRequest as jest.Mock;

const PENDING_INVITATION: InvitationPreview = {
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  email: 'nuevo@empresa.com',
  status: 'PENDING',
};

describe('JoinView', () => {
  const checkRfcMutate = jest.fn();
  const acceptInvitationMutate = jest.fn();

  beforeEach(() => {
    push.mockReset();
    checkRfcMutate.mockReset();
    acceptInvitationMutate.mockReset();
    useAuthStore.setState({ activeAccount: null, accountsList: [] });

    mockedUseInvitationPreview.mockReturnValue({
      data: PENDING_INVITATION,
      isLoading: false,
      isError: false,
    });
    mockedUseCheckRfc.mockReturnValue({
      mutate: checkRfcMutate,
      isPending: false,
    });
    mockedUseAcceptInvitation.mockReturnValue({
      mutate: acceptInvitationMutate,
      isPending: false,
    });
    mockedGetAuthToken.mockReturnValue(undefined);
    mockedGetAccountsCatalogRequest.mockResolvedValue([]);
  });

  it('muestra "Enlace inválido" sin consultar la invitación si falta token u orgId', () => {
    mockedUseInvitationPreview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<JoinView token={null} orgId="org-1" />);

    expect(screen.getByText(/enlace inválido/i)).toBeInTheDocument();
  });

  it('muestra el nombre de la organización y el formulario de RFC cuando la invitación está PENDING', () => {
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    expect(
      screen.getByText(/has sido invitado a acme corp/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/rfc/i)).toBeInTheDocument();
  });

  it('muestra un mensaje si la invitación ya expiró', () => {
    mockedUseInvitationPreview.mockReturnValue({
      data: { ...PENDING_INVITATION, status: 'EXPIRED' },
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    expect(screen.getByText(/invitación expirada/i)).toBeInTheDocument();
  });

  it('muestra un mensaje si la invitación ya fue utilizada', () => {
    mockedUseInvitationPreview.mockReturnValue({
      data: { ...PENDING_INVITATION, status: 'ACCEPTED' },
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    expect(screen.getByText(/invitación ya utilizada/i)).toBeInTheDocument();
  });

  it('RFC nuevo (no existe): redirige a /signup con rfc, token y orgId', async () => {
    const user = userEvent.setup();
    checkRfcMutate.mockImplementation((rfc, { onSuccess }) => onSuccess(false));
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    await user.type(screen.getByLabelText(/rfc/i), 'XAXX010101000');
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(checkRfcMutate).toHaveBeenCalledWith(
      'XAXX010101000',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(push).toHaveBeenCalledWith(
      '/signup?rfc=XAXX010101000&token=token-1&orgId=org-1',
    );
  });

  it('RFC existente: muestra la confirmación de unirse con el aviso de privacidad', async () => {
    const user = userEvent.setup();
    checkRfcMutate.mockImplementation((rfc, { onSuccess }) => onSuccess(true));
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    await user.type(screen.getByLabelText(/rfc/i), 'XAXX010101000');
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByText(/con tu usuario/i)).toBeInTheDocument();
    expect(
      screen.getByText('Acme Corp', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tu perfil principal es independiente/i),
    ).toBeInTheDocument();
  });

  it('al confirmar "Unirse" sin sesión activa, acepta la invitación y redirige a /login', async () => {
    const user = userEvent.setup();
    checkRfcMutate.mockImplementation((rfc, { onSuccess }) => onSuccess(true));
    acceptInvitationMutate.mockImplementation((vars, { onSuccess }) =>
      onSuccess(undefined),
    );
    mockedGetAuthToken.mockReturnValue(undefined);
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    await user.type(screen.getByLabelText(/rfc/i), 'XAXX010101000');
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /^unirse$/i }));

    expect(acceptInvitationMutate).toHaveBeenCalledWith(
      { token: 'token-1', rfc: 'XAXX010101000' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });

  it('al confirmar "Unirse" con sesión activa, actualiza el store y redirige a /documents/create', async () => {
    const user = userEvent.setup();
    checkRfcMutate.mockImplementation((rfc, { onSuccess }) => onSuccess(true));
    acceptInvitationMutate.mockImplementation((vars, { onSuccess }) =>
      onSuccess(undefined),
    );
    mockedGetAuthToken.mockReturnValue('valid-jwt');
    mockedGetAccountsCatalogRequest.mockResolvedValue([
      {
        id: 'account-1',
        type: 'ORGANIZATION',
        createdAt: '2026-01-01T00:00:00Z',
        organizationId: 'org-1',
        organizationDetail: { name: 'Acme Corp' },
        roleId: 'role-1',
        isActive: true,
      },
    ]);
    renderWithProviders(<JoinView token="token-1" orgId="org-1" />);

    await user.type(screen.getByLabelText(/rfc/i), 'XAXX010101000');
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('button', { name: /^unirse$/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/documents/create'));
    expect(useAuthStore.getState().activeAccount?.id).toBe('account-1');
  });
});
