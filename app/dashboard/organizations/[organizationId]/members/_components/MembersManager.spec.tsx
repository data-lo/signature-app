import userEvent from '@testing-library/user-event';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useMemberPermissions } from '../_hooks/useMemberPermissions';
import { updateOrganizationMemberRoleAction } from '@/app/server-actions/organizations/update-organization-member-role.server-action';
import { removeOrganizationMemberAction } from '@/app/server-actions/organizations/remove-organization-member.server-action';
import { updateOrganizationMemberPermissionsAction } from '@/app/server-actions/organizations/update-organization-member-permissions.server-action';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationMember } from '@/lib/api/organization-members';
import type { OrganizationPermission } from '@/lib/api/organization-permissions';
import MembersManager from './MembersManager';

const mockRefresh = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace }),
}));
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock('../_hooks/useMemberPermissions');
jest.mock(
  '@/app/server-actions/organizations/update-organization-member-role.server-action',
  () => ({ updateOrganizationMemberRoleAction: jest.fn() }),
);
jest.mock(
  '@/app/server-actions/organizations/remove-organization-member.server-action',
  () => ({ removeOrganizationMemberAction: jest.fn() }),
);
jest.mock(
  '@/app/server-actions/organizations/update-organization-member-permissions.server-action',
  () => ({ updateOrganizationMemberPermissionsAction: jest.fn() }),
);
jest.mock(
  '@/app/server-actions/organizations/invite-organization-member.server-action',
  () => ({ inviteOrganizationMemberAction: jest.fn() }),
);

const mockedUseSystemRoles = useSystemRoles as jest.Mock;
const mockedUseMemberPermissions = useMemberPermissions as jest.Mock;
const mockedUpdateRole = updateOrganizationMemberRoleAction as jest.Mock;
const mockedRemoveMember = removeOrganizationMemberAction as jest.Mock;
const mockedUpdatePermissions =
  updateOrganizationMemberPermissionsAction as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
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
    status: 'active',
    isActive: true,
    permissions: [],
  },
];

const PERMISSIONS: OrganizationPermission[] = [
  {
    id: 'permission-1',
    organizationId: 'org-1',
    name: 'Aprobar gastos',
    isActive: true,
    createdAt: '2023-10-25T10:00:00Z',
  },
];

/**
 * Por defecto se monta con `MEMBER.READ` y `MEMBER.INVITE`: es el rol que llega a esta pantalla
 * pudiendo dar de alta, que es el caso que ejercitan casi todas las pruebas. Las que miran el
 * otro lado pasan sólo `MEMBER.READ`.
 */
function renderManager(
  includeInactive = false,
  memberPermissions: readonly PermissionKey[] = ['MEMBER.READ', 'MEMBER.INVITE'],
) {
  return renderWithProviders(
    <MembersManager
      organizationId="org-1"
      members={MEMBERS}
      permissions={PERMISSIONS}
      includeInactive={includeInactive}
    />,
    { permissions: memberPermissions },
  );
}

/** El menú de acciones de la única fila. Lleva nombre accesible porque la fila tiene más de un botón. */
const rowActions = () =>
  screen.getByRole('button', { name: 'Acciones de miembro@empresa.com' });

describe('MembersManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSystemRoles.mockReturnValue({
      data: [
        {
          id: 'admin-role-1',
          name: 'ADMIN',
          isSystemRole: true,
          permissions: [],
        },
        {
          id: 'member-role-1',
          name: 'MEMBER',
          isSystemRole: true,
          permissions: [],
        },
      ],
      isLoading: false,
    });
    mockedUseMemberPermissions.mockReturnValue({ data: [], isLoading: false });
    mockedUpdateRole.mockResolvedValue({ ok: true });
    mockedRemoveMember.mockResolvedValue({ ok: true });
    mockedUpdatePermissions.mockResolvedValue({ ok: true });
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
  });

  it('renderiza los miembros que le llegan sin volver a pedirlos', () => {
    renderManager();

    expect(screen.getByText('miembro@empresa.com')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('editar rol: llama al Server Action con la membresía, la organización y el rol nuevo', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /editar rol/i }),
    );

    const roleSelect = await screen.findByRole('combobox', { name: /rol/i });
    roleSelect.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: 'ADMINISTRADOR' }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockedUpdateRole).toHaveBeenCalledWith(
        'account-1',
        'org-1',
        'admin-role-1',
      );
    });
  });

  /**
   * El refresco no es cosmético: `revalidatePath` invalida el caché del servidor, pero es
   * `router.refresh()` lo que hace que ESTA vista vuelva a pedir su render. Sin él, la tabla
   * seguiría mostrando el estado anterior después de una mutación correcta.
   */
  it('tras una mutación correcta refresca la ruta para traer los datos del servidor', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );
    expect(
      await screen.findByText(/perderá el acceso inmediatamente/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    await waitFor(() => {
      expect(mockedRemoveMember).toHaveBeenCalledWith('account-1', 'org-1');
    });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  /** Si el backend rechaza, no se refresca: no hay nada nuevo que traer y el aviso lo explica. */
  it('ante un rechazo del backend no refresca la ruta', async () => {
    mockedRemoveMember.mockResolvedValue({
      ok: false,
      message: 'No puedes eliminar al último administrador',
    });
    const user = userEvent.setup();
    renderManager();

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /eliminar/i }),
    );
    await user.click(
      await screen.findByRole('button', { name: /^eliminar$/i }),
    );

    await waitFor(() => expect(mockedRemoveMember).toHaveBeenCalled());
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('etiquetas del catálogo: marca una y la manda al Server Action', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(rowActions());
    await user.click(
      await screen.findByRole('menuitem', { name: /etiquetas del catálogo/i }),
    );

    // El catálogo llega por props desde el servidor: no hay consulta que esperar para pintarlo.
    expect(await screen.findByText(/no otorgan accesos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /aprobar gastos/i }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockedUpdatePermissions).toHaveBeenCalledWith(
        'account-1',
        'org-1',
        ['permission-1'],
      );
    });
  });

  /**
   * El filtro vive en la URL y no en un estado de React: así lo resuelve el mismo render del
   * servidor que trae la lista, en vez de que el navegador vuelva a pedir los miembros — que es
   * justo lo que esta migración vino a quitar.
   */
  it('el filtro de dados de baja navega, no dispara una consulta desde el cliente', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(
      screen.getByRole('switch', { name: /mostrar miembros dados de baja/i }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/dashboard/organizations/org-1/members?includeInactive=true',
      );
    });
  });

  it('al desmarcar el filtro quita el parámetro de la URL', async () => {
    const user = userEvent.setup();
    renderManager(true);

    await user.click(
      screen.getByRole('switch', { name: /mostrar miembros dados de baja/i }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/dashboard/organizations/org-1/members',
      );
    });
  });

  /**
   * Historia "Unificar invitaciones de miembros": invitar es el único camino de alta, también
   * cuando ya hay miembros en la tabla.
   */
  it('ofrece sólo invitar miembros junto a la tabla, sin alta directa', () => {
    renderManager();

    expect(
      screen.getByRole('button', { name: /invitar miembro/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /agregar miembro/i }),
    ).not.toBeInTheDocument();
  });

  it('a quien sólo puede leer no le ofrece ninguna acción', () => {
    renderManager(false, ['MEMBER.READ']);

    // La lista se sigue viendo: tiene permiso de lectura, que es como llegó hasta acá.
    expect(screen.getByText('miembro@empresa.com')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Acciones de miembro@empresa.com',
      }),
    ).not.toBeInTheDocument();
  });

  /**
   * Quien se suma a la organización nace MIEMBRO mientras nadie diga otra cosa: es el rol mínimo
   * del catálogo, y dejar el selector vacío obligaba a elegir a mano en cada alta —con el riesgo
   * de que el clic cayera en un rol que administra—. El tag que se ve es `MIEMBRO`; lo que viaja
   * al backend sigue siendo el id del rol `MEMBER`.
   */
  describe('rol predeterminado', () => {
    it('propone MIEMBRO al invitar a alguien que todavía no se registró', async () => {
      const user = userEvent.setup();
      renderManager();

      await user.click(screen.getByRole('button', { name: /invitar miembro/i }));

      const roleSelect = await screen.findByRole('combobox', { name: /rol/i });
      await waitFor(() => expect(roleSelect).toHaveTextContent('MIEMBRO'));
    });
  });

});
