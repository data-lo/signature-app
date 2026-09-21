import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, within } from '@/test-utils';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { RoleData } from '@/lib/api/roles';
import InviteMemberModal from './InviteMemberModal';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock(
  '@/app/server-actions/organizations/invite-organization-member.server-action',
  () => ({ inviteOrganizationMemberAction: jest.fn() }),
);

const mockedUseSystemRoles = useSystemRoles as jest.Mock;

/** El catálogo tal como lo publica `GET /api/v1/roles`, con OWNER incluido. */
const ROLES: RoleData[] = [
  { id: 'owner-role', name: 'OWNER', isSystemRole: true, permissions: [] },
  { id: 'admin-role', name: 'ADMIN', isSystemRole: true, permissions: [] },
  { id: 'member-role', name: 'MEMBER', isSystemRole: true, permissions: [] },
];

/**
 * Historia "Ocultar rol OWNER en la gestión de miembros": la ventana de alta no ofrece
 * PROPIETARIO, y el resto de los roles se sigue pudiendo elegir.
 *
 * Antes cubría dos ventanas. El alta directa ("Agregar miembro") se retiró al dejar la
 * invitación por RFC como único camino, así que sólo queda "Invitar miembro"; el filtro vive en
 * `assignableMemberRoles` y tiene su propia prueba en `lib/assignable-member-roles.spec.ts`.
 */
describe('ventana "Invitar miembro"', () => {
  beforeEach(() => {
    mockedUseSystemRoles.mockReturnValue({ data: ROLES, isLoading: false });
    useAuthStore.setState({
      activeAccount: {
        id: 'org-account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'admin-role',
      },
    });
  });

  async function openRoleOptions() {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal organizationId="org-1" />);

    await user.click(screen.getByRole('button', { name: /Invitar miembro/i }));
    const dialog = await screen.findByRole('dialog');
    const roleSelect = within(dialog).getByRole('combobox', { name: /rol/i });
    roleSelect.focus();
    await user.keyboard('{Enter}');

    return { user, roleSelect };
  }

  it('no ofrece el rol OWNER', async () => {
    await openRoleOptions();

    expect(screen.queryByRole('option', { name: 'PROPIETARIO' })).not.toBeInTheDocument();
  });

  it('ofrece el resto de los roles y deja elegirlos', async () => {
    const { user, roleSelect } = await openRoleOptions();

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'ADMINISTRADOR',
      'MIEMBRO',
    ]);

    await user.click(screen.getByRole('option', { name: 'ADMINISTRADOR' }));
    expect(roleSelect).toHaveTextContent('ADMINISTRADOR');
  });
});
