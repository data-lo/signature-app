import userEvent from '@testing-library/user-event';

import { renderWithProviders, screen } from '@/test-utils';
import {
  getOrganizationRolesRequest,
  type OrganizationRole,
} from '@/lib/api/organization-roles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { PermissionKey } from '@/lib/authorization/authorization.types';

import RolesView, { ROLES_LOAD_ERROR_MESSAGE } from './RolesView';

jest.mock('@/lib/api/organization-roles');

const mockedGetRoles = getOrganizationRolesRequest as jest.Mock;

const ROLES: OrganizationRole[] = [
  {
    id: 'role-admin',
    name: 'ADMIN',
    isSystemRole: true,
    permissions: [],
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'role-aprobador',
    name: 'Aprobador',
    isSystemRole: false,
    permissions: [],
    createdAt: '2026-02-01T10:00:00.000Z',
  },
];

function renderView(permissions: PermissionKey[]) {
  return renderWithProviders(<RolesView />, { permissions });
}

/**
 * La vista conecta la tabla homologada con la consulta y los modales: se comprueba que la carga
 * y el error lleguen a la tarjeta, y que los permisos sigan decidiendo qué se ofrece.
 */
describe('RolesView', () => {
  beforeEach(() => {
    mockedGetRoles.mockReset();
    mockedGetRoles.mockResolvedValue(ROLES);
    useAuthStore.setState({
      activeAccount: {
        id: 'org-account-1',
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'admin-role-1',
      },
    });
  });

  it('muestra la cabecera y los roles dentro de la tarjeta de tabla', async () => {
    const { container } = renderView(['ROLE.READ']);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Roles y permisos' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Aprobador')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="roles-table-card"]'),
    ).toBeInTheDocument();
  });

  it('si la consulta falla, el error se pinta dentro de la tabla', async () => {
    mockedGetRoles.mockRejectedValue(new Error('500'));

    renderView(['ROLE.READ']);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ROLES_LOAD_ERROR_MESSAGE,
    );
  });

  it('con sólo ROLE.READ no ofrece crear ni acciones por fila', async () => {
    renderView(['ROLE.READ']);

    await screen.findByText('Aprobador');

    expect(
      screen.queryByRole('button', { name: /crear rol/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /acciones de/i }),
    ).not.toBeInTheDocument();
  });

  it('con ROLE.MANAGE, "Editar" abre el modal de edición del rol de esa fila', async () => {
    const user = userEvent.setup();
    renderView(['ROLE.READ', 'ROLE.MANAGE']);

    expect(
      await screen.findByRole('button', { name: /crear rol/i }),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', { name: 'Acciones de Aprobador' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /editar/i }));

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Cambia el nombre o los permisos de Aprobador.',
    );
  });
});
