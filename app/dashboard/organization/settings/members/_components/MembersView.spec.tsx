import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import MembersView from './MembersView';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useOrganizationPermissions } from '@/lib/hooks/useOrganizationPermissions';
import { useOrganizationMembers } from '../_hooks/useOrganizationMembers';
import { useAddMember } from '../_hooks/useAddMember';
import { useUpdateMemberRole } from '../_hooks/useUpdateMemberRole';
import { useRemoveMember } from '../_hooks/useRemoveMember';
import { useMemberPermissions } from '../_hooks/useMemberPermissions';
import { useUpdateMemberPermissions } from '../_hooks/useUpdateMemberPermissions';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationMember } from '@/lib/api/organization-members';
import type { RolePermission } from '@/lib/api/roles';

jest.mock('@/lib/hooks/useIsOrganizationAdmin');
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock('@/lib/hooks/useOrganizationPermissions');
jest.mock('../_hooks/useOrganizationMembers');
jest.mock('../_hooks/useAddMember');
jest.mock('../_hooks/useUpdateMemberRole');
jest.mock('../_hooks/useRemoveMember');
jest.mock('../_hooks/useMemberPermissions');
jest.mock('../_hooks/useUpdateMemberPermissions');

const mockedUseIsOrganizationAdmin = useIsOrganizationAdmin as jest.Mock;
const mockedUseSystemRoles = useSystemRoles as jest.Mock;
const mockedUseOrganizationPermissions =
  useOrganizationPermissions as jest.Mock;
const mockedUseOrganizationMembers = useOrganizationMembers as jest.Mock;
const mockedUseAddMember = useAddMember as jest.Mock;
const mockedUseUpdateMemberRole = useUpdateMemberRole as jest.Mock;
const mockedUseRemoveMember = useRemoveMember as jest.Mock;
const mockedUseMemberPermissions = useMemberPermissions as jest.Mock;
const mockedUseUpdateMemberPermissions =
  useUpdateMemberPermissions as jest.Mock;

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

const MEMBER_PERMISSIONS: RolePermission[] = [
  {
    id: 'permission-create',
    key: 'DOCUMENT.CREATE',
    resource: 'DOCUMENT',
    action: 'CREATE',
    scope: 'ANY',
    description:
      'Crear documentos o borradores dentro de la organización activa.',
    isStaticCatalog: true,
  },
  {
    id: 'permission-sign-self',
    key: 'DOCUMENT.SIGN_SELF',
    resource: 'DOCUMENT',
    action: 'SIGN',
    scope: 'SELF',
    description: 'Firmar en nombre propio e incluirse como firmante.',
    isStaticCatalog: true,
  },
];

const ADMIN_PERMISSIONS: RolePermission[] = [
  ...MEMBER_PERMISSIONS,
  {
    id: 'permission-invite',
    key: 'MEMBER.INVITE',
    resource: 'MEMBER',
    action: 'INVITE',
    scope: 'ANY',
    description: 'Invitar miembros a la organización activa.',
    isStaticCatalog: true,
  },
];

const MEMBERS: OrganizationMember[] = [
  {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'miembro@empresa.com',
    rfc: 'XAXX010101000',
    role: { id: 'member-role-1', name: 'MEMBER' },
    joinedAt: '2023-10-25T10:00:00Z',
    status: 'active',
    isActive: true,
    permissions: MEMBER_PERMISSIONS,
  },
];

describe('MembersView', () => {
  const addMemberMutate = jest.fn();
  const updateRoleMutate = jest.fn();
  const removeMemberMutate = jest.fn();
  const updateMemberPermissionsMutate = jest.fn();

  const rowActions = () =>
    screen.getByRole('button', { name: 'Acciones de miembro@empresa.com' });

  beforeEach(() => {
    addMemberMutate.mockReset();
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
        {
          id: 'admin-role-1',
          name: 'ADMIN',
          isSystemRole: true,
          permissions: ADMIN_PERMISSIONS,
        },
        {
          id: 'member-role-1',
          name: 'MEMBER',
          isSystemRole: true,
          permissions: MEMBER_PERMISSIONS,
        },
      ],
      isLoading: false,
    });
    mockedUseOrganizationPermissions.mockReturnValue({
      data: [
        {
          id: 'perm-1',
          organizationId: 'org-1',
          name: 'Aprobar',
          isActive: true,
        },
      ],
      isLoading: false,
    });
    mockedUseOrganizationMembers.mockReturnValue({
      data: MEMBERS,
      isLoading: false,
    });
    mockedUseAddMember.mockReturnValue({
      mutate: addMemberMutate,
      isPending: false,
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
    expect(mockedUseOrganizationMembers).toHaveBeenCalledWith(
      'org-1',
      false,
      false,
    );
  });

  it('renderiza la tabla de miembros cuando el usuario es ADMIN de una organización', () => {
    renderWithProviders(<MembersView />);

    expect(screen.getByText('miembro@empresa.com')).toBeInTheDocument();
    expect(mockedUseOrganizationMembers).toHaveBeenCalledWith(
      'org-1',
      true,
      false,
    );
  });

  /**
   * La lista por defecto sólo trae miembros vigentes; el interruptor es lo que permite entender
   * por qué un correo dado de baja no se puede volver a agregar.
   */
  it('al activar el interruptor pide también las membresías dadas de baja', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    await user.click(
      screen.getByRole('switch', { name: /mostrar miembros dados de baja/i }),
    );

    expect(mockedUseOrganizationMembers).toHaveBeenLastCalledWith(
      'org-1',
      true,
      true,
    );
  });

  it('editar rol: abre el modal, selecciona un rol nuevo y llama a la mutación con accountId+roleId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /editar rol/i }),
    );

    expect(
      await screen.findByText(/selecciona el nuevo rol/i),
    ).toBeInTheDocument();

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

  /**
   * Criterio de la historia: los permisos del rol se ven ANTES de confirmar. Cambiar de rol es
   * cambiar lo que esa persona podrá hacer, y el nombre del rol por sí solo no lo dice.
   */
  it('editar rol: muestra los permisos del rol elegido antes de guardar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /editar rol/i }),
    );

    const roleSelect = screen.getByRole('combobox', { name: /rol/i });
    roleSelect.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'ADMIN' }));

    expect(
      await screen.findByText('Invitar miembros a la organización activa.'),
    ).toBeInTheDocument();
    expect(updateRoleMutate).not.toHaveBeenCalled();
  });

  it('eliminar: abre el diálogo de confirmación y llama a la mutación con el accountId', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );

    expect(
      await screen.findByText(/perderá el acceso inmediatamente/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    expect(removeMemberMutate).toHaveBeenCalledWith(
      'account-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('etiquetas del catálogo: abre el modal, marca una y llama a la mutación con accountId+permissionIds', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MembersView />);

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /etiquetas del catálogo/i }),
    );

    expect(await screen.findByText(/no otorgan accesos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /aprobar/i }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updateMemberPermissionsMutate).toHaveBeenCalledWith(
      { accountId: 'account-1', permissionIds: ['perm-1'] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  /**
   * Alta directa de quien ya tiene cuenta. Convive con la invitación por correo: son dos caminos
   * para dos situaciones distintas, y la pantalla ofrece los dos.
   */
  describe('"Agregar miembro"', () => {
    const addButton = () =>
      screen.queryByRole('button', { name: /agregar miembro/i });

    it('se ofrece junto a "Invitar miembro"', () => {
      renderWithProviders(<MembersView />);

      expect(addButton()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /invitar miembro/i }),
      ).toBeInTheDocument();
    });

    it('muestra los permisos del rol elegido y da de alta con correo y rol', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MembersView />);

      await user.click(addButton() as HTMLElement);

      await user.type(
        await screen.findByRole('textbox', { name: /correo electrónico/i }),
        'nueva@empresa.com',
      );

      const roleSelect = screen.getByRole('combobox', { name: /rol/i });
      roleSelect.focus();
      await user.keyboard('{Enter}');
      await user.click(screen.getByRole('option', { name: 'MEMBER' }));

      // Los permisos del rol se ven antes de confirmar, no después de guardar.
      expect(
        await screen.findByText(
          'Firmar en nombre propio e incluirse como firmante.',
        ),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^agregar$/i }));

      expect(addMemberMutate).toHaveBeenCalledWith(
        {
          email: 'nueva@empresa.com',
          roleId: 'member-role-1',
          position: undefined,
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('no se ofrece si el usuario no es ADMIN de la organización', () => {
      mockedUseIsOrganizationAdmin.mockReturnValue({
        isAdmin: false,
        isLoading: false,
      });
      renderWithProviders(<MembersView />);

      expect(addButton()).not.toBeInTheDocument();
    });

    it('no se ofrece en una cuenta personal', () => {
      useAuthStore.setState({ activeAccount: PERSONAL_ACCOUNT });
      renderWithProviders(<MembersView />);

      expect(addButton()).not.toBeInTheDocument();
    });
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
      expect(
        screen.getByRole('combobox', { name: /rol/i }),
      ).toBeInTheDocument();
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
