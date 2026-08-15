import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import MembersView from './MembersView';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useOrganizationPermissions } from '@/lib/hooks/useOrganizationPermissions';
import { useOrganizationMembers } from '../_hooks/useOrganizationMembers';
import { useUpdateMemberRole } from '../_hooks/useUpdateMemberRole';
import { useRemoveMember } from '../_hooks/useRemoveMember';
import { useMemberPermissions } from '../_hooks/useMemberPermissions';
import { useUpdateMemberPermissions } from '../_hooks/useUpdateMemberPermissions';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationMember } from '@/lib/api/organization-members';

jest.mock('@/lib/hooks/useIsOrganizationAdmin');
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock('@/lib/hooks/useOrganizationPermissions');
jest.mock('../_hooks/useOrganizationMembers');
jest.mock('../_hooks/useUpdateMemberRole');
jest.mock('../_hooks/useRemoveMember');
jest.mock('../_hooks/useMemberPermissions');
jest.mock('../_hooks/useUpdateMemberPermissions');

const mockedUseIsOrganizationAdmin = useIsOrganizationAdmin as jest.Mock;
const mockedUseSystemRoles = useSystemRoles as jest.Mock;
const mockedUseOrganizationPermissions = useOrganizationPermissions as jest.Mock;
const mockedUseOrganizationMembers = useOrganizationMembers as jest.Mock;
const mockedUseUpdateMemberRole = useUpdateMemberRole as jest.Mock;
const mockedUseRemoveMember = useRemoveMember as jest.Mock;
const mockedUseMemberPermissions = useMemberPermissions as jest.Mock;
const mockedUseUpdateMemberPermissions = useUpdateMemberPermissions as jest.Mock;

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
  const updateMemberPermissionsMutate = jest.fn();

  beforeEach(() => {
    updateRoleMutate.mockReset();
    removeMemberMutate.mockReset();
    updateMemberPermissionsMutate.mockReset();
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
    mockedUseOrganizationPermissions.mockReturnValue({
      data: [
        { id: 'perm-1', organizationId: 'org-1', name: 'Aprobar', isActive: true },
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
    mockedUseMemberPermissions.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockedUseUpdateMemberPermissions.mockReturnValue({
      mutate: updateMemberPermissionsMutate,
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

    const roleSelect = screen.getByRole('combobox', { name: /rol/i });
    roleSelect.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'ADMIN' }));

    // El selector muestra el NOMBRE del rol, no su id: sin la prop `items` del Select,
    // `<Select.Value>` renderiza el valor crudo y acá se veía el UUID del rol.
    expect(roleSelect).toHaveTextContent('ADMIN');
    expect(roleSelect).not.toHaveTextContent('admin-role-1');

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

  it('configurar permisos: abre el modal, marca un permiso y llama a la mutación con accountId+permissionIds', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    const [rowActionsTrigger] = screen.getAllByRole('button', { name: '' });
    await user.click(rowActionsTrigger);
    await user.click(
      await screen.findByRole('menuitem', { name: /configurar permisos/i }),
    );

    expect(
      await screen.findByText(/selecciona los permisos que tendrá/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /aprobar/i }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updateMemberPermissionsMutate).toHaveBeenCalledWith(
      { accountId: 'account-1', permissionIds: ['perm-1'] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  /**
   * Historia "Reubicar botón Invitar miembro": el botón vivía en la pantalla de creación de
   * documento y se centralizó acá. El comportamiento del formulario en sí lo cubre
   * `InviteMemberModal.spec.tsx`; estas pruebas verifican que quede montado en esta sección y que
   * herede sus guardas de acceso.
   */
  describe('"Invitar miembro"', () => {
    const inviteButton = () =>
      screen.queryByRole('button', { name: /invitar miembro/i });

    it('se ofrece desde esta sección', () => {
      renderWithProviders(<MembersView />);

      expect(inviteButton()).toBeInTheDocument();
    });

    it('abre el formulario de invitación con los roles del sistema', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MembersView />);

      await user.click(inviteButton() as HTMLElement);

      expect(
        await screen.findByText(/ingresa el correo del nuevo miembro/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: /correo electrónico/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /rol/i })).toBeInTheDocument();
    });

    // Invitar exige ser ADMIN/OWNER en el backend (`POST /organizations/invite`); al vivir dentro
    // de esta vista, el botón queda detrás de la misma guarda en vez de depender de la suya.
    it('no se ofrece si el usuario no es ADMIN de la organización', () => {
      mockedUseIsOrganizationAdmin.mockReturnValue({
        isAdmin: false,
        isLoading: false,
      });
      renderWithProviders(<MembersView />);

      expect(inviteButton()).not.toBeInTheDocument();
    });

    it('no se ofrece en una cuenta personal', () => {
      useAuthStore.setState({ activeAccount: PERSONAL_ACCOUNT });
      renderWithProviders(<MembersView />);

      expect(inviteButton()).not.toBeInTheDocument();
    });
  });
});
