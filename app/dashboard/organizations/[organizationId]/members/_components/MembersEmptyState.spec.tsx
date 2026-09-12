import { renderWithProviders, screen } from '@/test-utils';
import { useIsOrganizationAdmin } from '@/lib/hooks/useIsOrganizationAdmin';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import MembersEmptyState from './MembersEmptyState';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/lib/hooks/useIsOrganizationAdmin');
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock(
  '@/app/server-actions/organizations/invite-organization-member.server-action',
  () => ({ inviteOrganizationMemberAction: jest.fn() }),
);
jest.mock(
  '@/app/server-actions/organizations/add-organization-member.server-action',
  () => ({ addOrganizationMemberAction: jest.fn() }),
);

const mockedUseIsOrganizationAdmin = useIsOrganizationAdmin as jest.Mock;
const mockedUseSystemRoles = useSystemRoles as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'admin-role-1',
};

describe('MembersEmptyState', () => {
  beforeEach(() => {
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: true,
      isLoading: false,
    });
    mockedUseSystemRoles.mockReturnValue({ data: [], isLoading: false });
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
  });

  it('explica que todavía no hay miembros invitados', () => {
    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(screen.getByText('Aún no has invitado miembros')).toBeInTheDocument();
    expect(
      screen.getByText(
        /invita miembros a tu organización para colaborar y administrar sus permisos/i,
      ),
    ).toBeInTheDocument();
  });

  /**
   * El botón es la razón de ser de esta pantalla: sin miembros, invitar es literalmente lo único
   * que hay que hacer, y esconderlo detrás de una tabla vacía dejaba al administrador buscando.
   */
  it('ofrece "Invitar miembro" aunque no exista ningún miembro', () => {
    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(
      screen.getByRole('button', { name: /invitar miembro/i }),
    ).toBeInTheDocument();
  });

  /** No se dibuja tabla: ni encabezados, ni columnas, ni filas vacías. */
  it('no renderiza la tabla ni sus encabezados', () => {
    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Correo' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Fecha de ingreso')).not.toBeInTheDocument();
  });

  it('también ofrece el alta directa de quien ya tiene cuenta', () => {
    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(
      screen.getByRole('button', { name: /agregar miembro/i }),
    ).toBeInTheDocument();
  });

  /**
   * Mismo gate que rige la tabla: a quien sólo puede leer no se le ofrecen acciones que el
   * backend va a rechazar.
   */
  it('no ofrece acciones de alta a quien no administra la organización', () => {
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: false,
      isLoading: false,
    });

    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(screen.getByText('Aún no has invitado miembros')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /agregar miembro/i }),
    ).not.toBeInTheDocument();
  });

  it('mantiene las acciones ocultas mientras el rol no se ha resuelto', () => {
    mockedUseIsOrganizationAdmin.mockReturnValue({
      isAdmin: false,
      isLoading: true,
    });

    renderWithProviders(<MembersEmptyState organizationId="org-1" />);

    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
  });
});
