import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { BackendRequestError } from '@/lib/server/backend-request';
import { getOrganizationMembersAction } from '@/app/server-actions/organizations/get-organization-members.server-action';
import { getOrganizationPermissionsAction } from '@/app/server-actions/organizations/get-organization-permissions.server-action';
import type { OrganizationMember } from '@/lib/api/organization-members';
import MembersSection from './MembersSection';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
jest.mock(
  '@/app/server-actions/organizations/get-organization-members.server-action',
);
jest.mock(
  '@/app/server-actions/organizations/get-organization-permissions.server-action',
);

/*
  Los dos hijos se sustituyen por marcadores: lo que esta prueba verifica es el reparto y el
  manejo del fallo, no lo que cada uno dibuja. Sus propias pruebas cubren eso, y montarlos aquí
  arrastraría el store, el enrutador y el catálogo de roles a una prueba que no habla de ellos.
*/
jest.mock('./MembersManager', () => ({
  __esModule: true,
  default: ({ members }: { members: OrganizationMember[] }) => (
    <div data-testid="members-manager">{members.length} miembros</div>
  ),
}));
jest.mock('./MembersEmptyState', () => ({
  __esModule: true,
  default: () => <div data-testid="members-empty-state" />,
}));

const mockedGetMembers = getOrganizationMembersAction as jest.Mock;
const mockedGetPermissions = getOrganizationPermissionsAction as jest.Mock;
const mockedRedirect = redirect as unknown as jest.Mock;

const MEMBER: OrganizationMember = {
  accountId: 'account-1',
  userId: 'user-1',
  email: 'miembro@empresa.com',
  rfc: 'XAXX010101000',
  role: { id: 'member-role-1', name: 'MEMBER' },
  joinedAt: '2023-10-25T10:00:00Z',
  status: 'active',
  isActive: true,
  permissions: [],
};

describe('MembersSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetPermissions.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pide miembros y permisos en el servidor y renderiza la tabla', async () => {
    mockedGetMembers.mockResolvedValue([MEMBER]);

    render(
      await MembersSection({ organizationId: 'org-1', includeInactive: false }),
    );

    expect(mockedGetMembers).toHaveBeenCalledWith('org-1', false);
    expect(mockedGetPermissions).toHaveBeenCalledWith('org-1');
    expect(screen.getByTestId('members-manager')).toHaveTextContent(
      '1 miembros',
    );
    expect(screen.queryByTestId('members-empty-state')).not.toBeInTheDocument();
  });

  /**
   * Criterio de la historia: sin miembros no se dibuja una tabla vacía. Una tabla con sus
   * encabezados y ningún renglón no dice "todavía no invitaste a nadie", dice "algo no cargó".
   */
  it('sin miembros muestra el estado vacío y NO la tabla', async () => {
    mockedGetMembers.mockResolvedValue([]);

    render(
      await MembersSection({ organizationId: 'org-1', includeInactive: false }),
    );

    expect(screen.getByTestId('members-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('members-manager')).not.toBeInTheDocument();
  });

  it('traslada el filtro de dados de baja a la consulta del servidor', async () => {
    mockedGetMembers.mockResolvedValue([MEMBER]);

    render(
      await MembersSection({ organizationId: 'org-1', includeInactive: true }),
    );

    expect(mockedGetMembers).toHaveBeenCalledWith('org-1', true);
  });

  /**
   * La sesión pudo caducar entre la navegación y el render. Mandarlo al login es la única acción
   * útil, y es lo que ya hace el interceptor de axios en el cliente.
   */
  it('manda al login cuando la sesión ya no vale', async () => {
    mockedGetMembers.mockRejectedValue(new BackendRequestError(401, 'sin sesión'));

    await expect(
      MembersSection({ organizationId: 'org-1', includeInactive: false }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  /**
   * Escribir a mano el id de otra organización llega hasta acá: el backend responde 403 y se
   * explica, en vez de mostrar la pantalla de error genérica, que haría pensar en una avería.
   */
  it('explica la falta de acceso en vez de lanzar al error boundary', async () => {
    mockedGetMembers.mockRejectedValue(
      new BackendRequestError(403, 'No eres miembro de esta organización'),
    );

    render(
      await MembersSection({ organizationId: 'ajena', includeInactive: false }),
    );

    expect(
      screen.getByText('No tienes acceso a los miembros de esta organización.'),
    ).toBeInTheDocument();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('relanza cualquier otro fallo para que lo recoja el error boundary', async () => {
    mockedGetMembers.mockRejectedValue(new BackendRequestError(500, 'interno'));

    await expect(
      MembersSection({ organizationId: 'org-1', includeInactive: false }),
    ).rejects.toMatchObject({ status: 500 });

    expect(console.error).toHaveBeenCalled();
  });
});
