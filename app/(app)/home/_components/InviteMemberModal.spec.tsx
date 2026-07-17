import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import InviteMemberModal from './InviteMemberModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useInviteMember } from '../_hooks/useInviteMember';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';

jest.mock('@/lib/hooks/useSystemRoles');
jest.mock('../_hooks/useInviteMember');

const mockedUseSystemRoles = useSystemRoles as jest.Mock;
const mockedUseInviteMember = useInviteMember as jest.Mock;

const ORGANIZATION_ACCOUNT: ActiveAccount = {
  id: 'org-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'admin-role-1',
};

const PERSONAL_ACCOUNT: ActiveAccount = {
  id: 'personal-1',
  accountType: 'PERSONAL',
  organizationId: null,
  roleId: 'admin-role-1',
};

describe('InviteMemberModal', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    mockedUseInviteMember.mockReturnValue({ mutate, isPending: false });
    mockedUseSystemRoles.mockReturnValue({
      data: [
        { id: 'admin-role-1', name: 'ADMIN', isSystemRole: true },
        { id: 'member-role-1', name: 'MEMBER', isSystemRole: true },
      ],
      isLoading: false,
    });
  });

  it('no renderiza nada si la cuenta activa no es una organización', () => {
    useAuthStore.setState({ activeAccount: PERSONAL_ACCOUNT });
    renderWithProviders(<InviteMemberModal />);

    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
  });

  it('el botón deshabilitado hasta llenar correo y rol; consulta GET /api/v1/roles al abrir', async () => {
    useAuthStore.setState({ activeAccount: ORGANIZATION_ACCOUNT });
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal />);

    await user.click(screen.getByRole('button', { name: /invitar miembro/i }));

    expect(mockedUseSystemRoles).toHaveBeenCalledWith(true);
    const submitButton = screen.getByRole('button', {
      name: /enviar invitación/i,
    });
    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'nuevo@empresa.com',
    );
    expect(submitButton).toBeDisabled();

    // jsdom no dispara los PointerEvent que @base-ui/react usa para abrir el
    // Select con click; el teclado (Enter abre, click en la opción cierra y
    // selecciona) sí dispara los mismos handlers y es el camino confiable
    // aquí (ver jest.setup.ts para el resto de los polyfills necesarios).
    screen.getByRole('combobox', { name: /rol/i }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'MEMBER' }));

    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it('envía email y roleId cuando el formulario es válido', async () => {
    useAuthStore.setState({ activeAccount: ORGANIZATION_ACCOUNT });
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal />);

    await user.click(screen.getByRole('button', { name: /invitar miembro/i }));
    await user.type(
      screen.getByLabelText(/correo electrónico/i),
      'nuevo@empresa.com',
    );
    screen.getByRole('combobox', { name: /rol/i }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'MEMBER' }));

    const submitButton = screen.getByRole('button', {
      name: /enviar invitación/i,
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    expect(mutate).toHaveBeenCalledWith(
      { email: 'nuevo@empresa.com', roleId: 'member-role-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('muestra el estado de carga mientras la mutación está pendiente', async () => {
    mockedUseInviteMember.mockReturnValue({ mutate, isPending: true });
    useAuthStore.setState({ activeAccount: ORGANIZATION_ACCOUNT });
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal />);

    await user.click(screen.getByRole('button', { name: /invitar miembro/i }));

    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
  });
});
