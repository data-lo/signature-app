import { renderWithProviders, screen } from '@/test-utils';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import { useSystemRoles } from '@/lib/hooks/useSystemRoles';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import MembersEmptyState from './MembersEmptyState';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/lib/hooks/useSystemRoles');
jest.mock(
  '@/app/server-actions/organizations/invite-organization-member.server-action',
  () => ({ inviteOrganizationMemberAction: jest.fn() }),
);
jest.mock(
  '@/app/server-actions/organizations/add-organization-member.server-action',
  () => ({ addOrganizationMemberAction: jest.fn() }),
);

const mockedUseSystemRoles = useSystemRoles as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'admin-role-1',
};

/**
 * Por defecto se monta con `MEMBER.READ` y `MEMBER.INVITE`: es el rol que ve esta pantalla y
 * puede dar de alta. Las pruebas que miran el otro lado pasan los suyos.
 */
function renderEmptyState(
  permissions: readonly PermissionKey[] = ['MEMBER.READ', 'MEMBER.INVITE'],
) {
  return renderWithProviders(<MembersEmptyState organizationId="org-1" />, {
    permissions,
  });
}

describe('MembersEmptyState', () => {
  beforeEach(() => {
    mockedUseSystemRoles.mockReturnValue({ data: [], isLoading: false });
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
  });

  it('explica que todavía no hay miembros invitados', () => {
    renderEmptyState();

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
    renderEmptyState();

    expect(
      screen.getByRole('button', { name: /invitar miembro/i }),
    ).toBeInTheDocument();
  });

  /** No se dibuja tabla: ni encabezados, ni columnas, ni filas vacías. */
  it('no renderiza la tabla ni sus encabezados', () => {
    renderEmptyState();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Correo' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Fecha de ingreso')).not.toBeInTheDocument();
  });

  it('también ofrece el alta directa de quien ya tiene cuenta', () => {
    renderEmptyState();

    expect(
      screen.getByRole('button', { name: /agregar miembro/i }),
    ).toBeInTheDocument();
  });

  /**
   * Mismo gate que rige la tabla: a quien sólo puede leer no se le ofrecen acciones que el
   * backend va a rechazar.
   */
  it('no ofrece acciones de alta a quien no puede invitar', () => {
    renderEmptyState(['MEMBER.READ']);

    expect(screen.getByText('Aún no has invitado miembros')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /agregar miembro/i }),
    ).not.toBeInTheDocument();
  });

  /**
   * El instante del cambio de cuenta, cuando los permisos viejos ya se descartaron: sin contexto
   * no se ofrece nada. Antes esto se llamaba "mientras el rol no se ha resuelto" y dependía de un
   * `isLoading`; ahora es la misma garantía sin estado intermedio que mantener.
   */
  it('mantiene las acciones ocultas cuando no hay permisos', () => {
    renderEmptyState([]);

    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
  });
});
