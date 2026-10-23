import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test-utils';
import { getOrganizationRolesRequest } from '@/lib/api/organization-roles';
import type { OrganizationRole } from '@/lib/api/organization-roles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import InviteMemberModal from './InviteMemberModal';
import { ROLES_LOAD_ERROR_MESSAGE } from './InviteMemberRoleSelect';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/lib/api/organization-roles');
jest.mock(
  '@/app/server-actions/organizations/invite-organization-member.server-action',
  () => ({ inviteOrganizationMemberAction: jest.fn() }),
);

const mockedGetRoles = getOrganizationRolesRequest as jest.Mock;

function role(
  id: string,
  name: string,
  isSystemRole = true,
): OrganizationRole {
  return { id, name, isSystemRole, permissions: [], createdAt: '2026-01-01T00:00:00Z' };
}

/** Lo que devuelve `GET /organizations/org-1/roles`: sistema (OWNER incluido) más uno propio. */
const ROLES: OrganizationRole[] = [
  role('owner-role', 'OWNER'),
  role('admin-role', 'ADMIN'),
  role('member-role', 'MEMBER'),
  role('approver-role', 'Aprobador', false),
];

/**
 * Historia "Cargar roles de la organización en el modal Invitar miembro". La consulta corre de
 * verdad con TanStack Query; sólo se simula la petición HTTP.
 */
describe('InviteMemberModal', () => {
  beforeEach(() => {
    mockedGetRoles.mockReset();
    useAuthStore.setState({
      activeAccount: {
        id: 'org-account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'admin-role',
      },
    });
  });

  async function openModal() {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal organizationId="org-1" />);
    await user.click(screen.getByRole('button', { name: /invitar miembro/i }));
    const dialog = await screen.findByRole('dialog');
    return { user, dialog };
  }

  function submitButton(dialog: HTMLElement) {
    return within(dialog).getByRole('button', { name: /enviar invitación/i });
  }

  it('no pide los roles hasta que se abre el modal', () => {
    mockedGetRoles.mockResolvedValue(ROLES);
    renderWithProviders(<InviteMemberModal organizationId="org-1" />);

    expect(mockedGetRoles).not.toHaveBeenCalled();
  });

  it('al abrir, pide los roles de la organización activa', async () => {
    mockedGetRoles.mockResolvedValue(ROLES);

    await openModal();

    expect(mockedGetRoles).toHaveBeenCalledWith('org-1');
  });

  it('mientras cargan, muestra el skeleton y no deja enviar', async () => {
    mockedGetRoles.mockReturnValue(new Promise(() => {}));

    const { user, dialog } = await openModal();

    expect(
      within(dialog).getByRole('status', { name: 'Cargando Rol' }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox', { name: /rol/i })).not.toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/correo electrónico/i),
      'nuevo@empresa.com',
    );
    expect(submitButton(dialog)).toBeDisabled();
  });

  it('al cargar, ofrece los roles de la organización sin OWNER y propone MIEMBRO', async () => {
    mockedGetRoles.mockResolvedValue(ROLES);

    const { user, dialog } = await openModal();

    const roleSelect = await within(dialog).findByRole('combobox', { name: /rol/i });
    await waitFor(() => expect(roleSelect).toHaveTextContent('MIEMBRO'));
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();

    roleSelect.focus();
    await user.keyboard('{Enter}');

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'ADMINISTRADOR',
      'MIEMBRO',
      'Aprobador',
    ]);
    expect(screen.queryByRole('option', { name: 'PROPIETARIO' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'Aprobador' }));
    expect(roleSelect).toHaveTextContent('Aprobador');
  });

  it('con los roles cargados y un correo válido, habilita el envío', async () => {
    mockedGetRoles.mockResolvedValue(ROLES);

    const { user, dialog } = await openModal();
    await within(dialog).findByRole('combobox', { name: /rol/i });
    await user.type(
      within(dialog).getByLabelText(/correo electrónico/i),
      'nuevo@empresa.com',
    );

    await waitFor(() => expect(submitButton(dialog)).toBeEnabled());
  });

  describe('si los roles no cargan', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('muestra un error claro y no deja enviar', async () => {
      mockedGetRoles.mockRejectedValue(new Error('500'));

      const { user, dialog } = await openModal();

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        ROLES_LOAD_ERROR_MESSAGE,
      );
      await user.type(
        within(dialog).getByLabelText(/correo electrónico/i),
        'nuevo@empresa.com',
      );
      expect(submitButton(dialog)).toBeDisabled();
    });

    it('cerrar y volver a abrir el modal reintenta la consulta', async () => {
      mockedGetRoles.mockRejectedValueOnce(new Error('500')).mockResolvedValue(ROLES);

      const { user, dialog } = await openModal();
      await within(dialog).findByRole('alert');

      await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /invitar miembro/i }));
      const reopened = await screen.findByRole('dialog');

      expect(
        await within(reopened).findByRole('combobox', { name: /rol/i }),
      ).toBeInTheDocument();
      expect(mockedGetRoles).toHaveBeenCalledTimes(2);
    });
  });
});
