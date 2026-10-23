import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { useOrganizationRoles } from '@/lib/hooks/useOrganizationRoles';
import type { OrganizationMember } from '@/lib/api/organization-members';
import { ROLES_LOAD_ERROR_MESSAGE } from './MemberRolesLoadError';
import EditRoleModal from './EditRoleModal';

jest.mock('@/lib/hooks/useOrganizationRoles');

const mockedUseOrganizationRoles = useOrganizationRoles as jest.Mock;

/**
 * Lo que devuelve `GET /organizations/:id/roles`: los roles de sistema —OWNER incluido— más los
 * propios de la organización. Antes este modal pedía `GET /roles`, que no trae los
 * personalizados, y de ahí salían los dos defectos que cubren estas pruebas.
 */
const ORGANIZATION_ROLES = [
  { id: 'admin-role-1', name: 'ADMIN', isSystemRole: true, permissions: [] },
  { id: 'member-role-1', name: 'MEMBER', isSystemRole: true, permissions: [] },
  { id: 'owner-role-1', name: 'OWNER', isSystemRole: true, permissions: [] },
  {
    id: 'custom-role-1',
    name: 'Aprobador',
    isSystemRole: false,
    permissions: [],
  },
];

function memberWithRole(
  role: OrganizationMember['role'],
): OrganizationMember {
  return {
    accountId: 'account-1',
    userId: 'user-1',
    email: 'miembro@empresa.com',
    rfc: 'XAXX010101000',
    role,
    joinedAt: '2023-10-25T10:00:00Z',
    status: 'active',
    isActive: true,
    permissions: [],
  };
}

const onConfirm = jest.fn();

function renderModal(member: OrganizationMember | null) {
  return renderWithProviders(
    <EditRoleModal
      organizationId="org-1"
      member={member}
      onOpenChange={jest.fn()}
      onConfirm={onConfirm}
    />,
  );
}

/** El disparador del selector. Lleva la etiqueta "Rol" del campo. */
const roleSelect = () => screen.findByRole('combobox', { name: /rol/i });

describe('EditRoleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseOrganizationRoles.mockReturnValue({
      data: ORGANIZATION_ROLES,
      isPending: false,
      isError: false,
      isSuccess: true,
    });
  });

  /**
   * El defecto reportado dos veces: el modal pedía el catálogo de SISTEMA, así que un rol
   * personalizado no estaba entre las opciones y el control, sin etiqueta que resolver, pintaba
   * el identificador crudo del rol en lugar de su nombre.
   */
  it('muestra el rol real del miembro, también cuando es un rol propio de la organización', async () => {
    renderModal(memberWithRole({ id: 'custom-role-1', name: 'Aprobador' }));

    await waitFor(async () =>
      expect(await roleSelect()).toHaveTextContent('Aprobador'),
    );
    expect(await roleSelect()).not.toHaveTextContent('custom-role-1');
  });

  it('pide los roles de la organización y sólo mientras el modal está abierto', () => {
    renderModal(memberWithRole({ id: 'member-role-1', name: 'MEMBER' }));

    expect(mockedUseOrganizationRoles).toHaveBeenCalledWith('org-1', true);
  });

  it('no consulta los roles con el modal cerrado', () => {
    renderModal(null);

    expect(mockedUseOrganizationRoles).toHaveBeenCalledWith('org-1', false);
  });

  /**
   * PROPIETARIO no se reparte: lo recibe quien crea la cuenta. El selector ofrece el resto del
   * catálogo de la organización, los personalizados incluidos.
   */
  it('no ofrece PROPIETARIO entre los roles asignables', async () => {
    const user = userEvent.setup();
    renderModal(memberWithRole({ id: 'member-role-1', name: 'MEMBER' }));

    (await roleSelect()).focus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('option', { name: 'ADMINISTRADOR' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'MIEMBRO' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Aprobador' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'PROPIETARIO' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Al propietario hay que mostrarle su rol real aunque nadie pueda elegirlo: esconderlo dejaría
   * el selector vacío o pintando el identificador de su rol.
   */
  it('al propietario le muestra PROPIETARIO como rol actual, sin ofrecerlo en la lista', async () => {
    const user = userEvent.setup();
    renderModal(memberWithRole({ id: 'owner-role-1', name: 'OWNER' }));

    await waitFor(async () =>
      expect(await roleSelect()).toHaveTextContent('PROPIETARIO'),
    );

    (await roleSelect()).focus();
    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('option', { name: 'ADMINISTRADOR' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'PROPIETARIO' }),
    ).not.toBeInTheDocument();
  });

  it('confirma con la membresía y el rol elegido', async () => {
    const user = userEvent.setup();
    renderModal(memberWithRole({ id: 'member-role-1', name: 'MEMBER' }));

    (await roleSelect()).focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('option', { name: 'Aprobador' }));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onConfirm).toHaveBeenCalledWith('account-1', 'custom-role-1');
  });

  it('mientras cargan los roles no hay selector que ofrecer ni nada que guardar', () => {
    mockedUseOrganizationRoles.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
    });
    renderModal(memberWithRole({ id: 'member-role-1', name: 'MEMBER' }));

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('si el catálogo falla lo dice y deja el guardado deshabilitado', () => {
    mockedUseOrganizationRoles.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
    });
    renderModal(memberWithRole({ id: 'member-role-1', name: 'MEMBER' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      ROLES_LOAD_ERROR_MESSAGE,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });
});
