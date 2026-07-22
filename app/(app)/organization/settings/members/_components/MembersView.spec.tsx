import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import MembersView from './MembersView';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useOrganizationMembers } from '../_hooks/useOrganizationMembers';
import { useUpdateMemberRole } from '../_hooks/useUpdateMemberRole';
import { useRemoveMember } from '../_hooks/useRemoveMember';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationMember } from '@/lib/api/organization-members';

jest.mock('@/lib/hooks/useIsOrganizationAdmin');
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock('../_hooks/useOrganizationMembers');
jest.mock('../_hooks/useUpdateMemberRole');
jest.mock('../_hooks/useRemoveMember');

const mockedUseIsOrganizationAdmin = useIsOrganizationAdmin as jest.Mock;
const mockedUseSystemRoles = useSystemRoles as jest.Mock;
const mockedUseOrganizationMembers = useOrganizationMembers as jest.Mock;
const mockedUseUpdateMemberRole = useUpdateMemberRole as jest.Mock;
const mockedUseRemoveMember = useRemoveMember as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
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

const MEMBERS: OrganizationMember[] = [
  {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'miembro@empresa.com',
    rfc: 'XAXX010101000',
    role: { id: 'member-role-1', name: 'MEMBER' },
    joinedAt: '2023-10-25T10:00:00Z',
  },
];

describe('MembersView', () => {
  const updateRoleMutate = jest.fn();
  const removeMemberMutate = jest.fn();

  beforeEach(() => {
    updateRoleMutate.mockReset();
    removeMemberMutate.mockReset();
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });
    mockedUseSystemRoles.mockReturnValue({
      data: [
        { id: 'admin-role-1', name: 'ADMIN', isSystemRole: true },
        { id: 'member-role-1', name: 'MEMBER', isSystemRole: true },
      ],
      isLoading: false,
    });
    mockedUseOrganizationMembers.mockReturnValue({
      data: MEMBERS,
      isLoading: false,
    });
    mockedUseUpdateMemberRole.mockReturnValue({
      mutate: updateRoleMutate,
      isPending: false,
    });
    mockedUseRemoveMember.mockReturnValue({
      mutate: removeMemberMutate,
      isPending: false,
    });
  });

  it('muestra un mensaje y no consulta el listado si la cuenta activa no es una organización', () => {
    useAuthStore.setState({ activeAccount: PERSONAL_ACCOUNT });
    renderWithProviders(<MembersView />);

    expect(
      screen.getByText(/selecciona una organización/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('miembro@empresa.com')).not.toBeInTheDocument();
  });

  it('muestra un mensaje de acceso restringido si el usuario no es ADMIN de la organización activa', () => {
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });
    renderWithProviders(<MembersView />);

    expect(
      screen.getByText(/no tienes permisos para gestionar/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('miembro@empresa.com')).not.toBeInTheDocument();
    expect(mockedUseOrganizationMembers).toHaveBeenCalledWith('org-1', false);
  });

  it('renderiza la tabla de miembros cuando el usuario es ADMIN de una organización', () => {
    renderWithProviders(<MembersView />);

    expect(screen.getByText('miembro@empresa.com')).toBeInTheDocument();
    expect(mockedUseOrganizationMembers).toHaveBeenCalledWith('org-1', true);
  });

  it('editar rol: abre el modal, selecciona un rol nuevo y llama a la mutación con accountId+roleId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    const [rowActionsTrigger] = screen.getAllByRole('button', { name: '' });
    await user.click(rowActionsTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /editar rol/i }));

    expect(await screen.findByText(/selecciona el nuevo rol/i)).toBeInTheDocument();

    screen.getByRole('combobox', { name: /rol/i }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'ADMIN' }));

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updateRoleMutate).toHaveBeenCalledWith(
      { accountId: 'account-1', roleId: 'admin-role-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('eliminar: abre el diálogo de confirmación y llama a la mutación con el accountId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    const [rowActionsTrigger] = screen.getAllByRole('button', { name: '' });
    await user.click(rowActionsTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    expect(
      await screen.findByText(/perderá el acceso inmediatamente/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    expect(removeMemberMutate).toHaveBeenCalledWith(
      'account-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
