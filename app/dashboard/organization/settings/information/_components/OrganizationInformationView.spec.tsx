import { renderWithProviders, screen } from '@/test-utils';
import { getOrganizationRequest } from '@/lib/api/organizations';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationProfile } from '@/lib/api/organizations';
import OrganizationInformationView, {
  EMPTY_FIELD_LABEL,
  ORGANIZATION_LOAD_ERROR_MESSAGE,
} from './OrganizationInformationView';

jest.mock('@/lib/api/organizations');

const mockedGetOrganization = getOrganizationRequest as jest.Mock;

const ORG_ACCOUNT: ActiveAccount = {
  id: 'org-account-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'admin-role-1',
};

const ORGANIZATION: OrganizationProfile = {
  id: 'org-1',
  name: 'Acme Corp S.A. de C.V.',
  displayName: 'Acme',
  rfc: 'ACM010101AAA',
  phoneNumber: '5512345678',
  address: 'Av. Reforma 123, CDMX',
  domainAllowed: 'acme.com',
  isActive: true,
};

function renderView() {
  return renderWithProviders(<OrganizationInformationView />, {
    permissions: ['ORGANIZATION.READ'],
  });
}

describe('OrganizationInformationView', () => {
  beforeEach(() => {
    mockedGetOrganization.mockReset();
    mockedGetOrganization.mockResolvedValue(ORGANIZATION);
    useAuthStore.setState({ activeAccount: ORG_ACCOUNT });
  });

  it('pide el perfil de la organización activa', async () => {
    renderView();

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(mockedGetOrganization).toHaveBeenCalledWith('org-1');
  });

  /**
   * Los seis campos del formulario que el backend sabe escribir. Sin esta prueba, publicar la
   * lectura y olvidarse de pintar uno pasaría inadvertido: la pantalla seguiría "funcionando".
   */
  it('muestra los seis campos del perfil con su rótulo', async () => {
    renderView();

    expect(await screen.findByText('Acme')).toBeInTheDocument();

    const expected: [string, string][] = [
      ['Nombre de visualización', 'Acme'],
      ['Razón social', 'Acme Corp S.A. de C.V.'],
      ['RFC', 'ACM010101AAA'],
      ['Teléfono', '5512345678'],
      ['Domicilio', 'Av. Reforma 123, CDMX'],
      ['Dominio permitido', 'acme.com'],
    ];

    for (const [label, value] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  /** Un hueco en blanco no distingue un dato que falta de un dato que no se supo pintar. */
  it('rotula "Sin capturar" los campos que la organización no tiene', async () => {
    mockedGetOrganization.mockResolvedValue({
      ...ORGANIZATION,
      rfc: null,
      phoneNumber: null,
      address: null,
      domainAllowed: null,
    });

    renderView();

    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getAllByText(EMPTY_FIELD_LABEL)).toHaveLength(4);
  });

  it('mientras carga muestra el esqueleto y ningún dato', () => {
    mockedGetOrganization.mockReturnValue(new Promise(() => {}));

    renderView();

    expect(
      screen.getByRole('status', {
        name: /cargando la información de la organización/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
  });

  it('si la consulta falla, muestra un error claro', async () => {
    mockedGetOrganization.mockRejectedValue(new Error('500'));

    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ORGANIZATION_LOAD_ERROR_MESSAGE,
    );
  });

  /**
   * La pantalla ya exige `ORGANIZATION.READ` en el servidor, pero el permiso puede caerse al
   * cambiar de cuenta sin recargar: entonces no se pide nada, en vez de provocar un 403.
   */
  it('sin permiso de lectura no consulta y lo explica', () => {
    renderWithProviders(<OrganizationInformationView />, { permissions: [] });

    expect(
      screen.getByText(/no tienes permisos para ver la información/i),
    ).toBeInTheDocument();
    expect(mockedGetOrganization).not.toHaveBeenCalled();
  });

  it('con una cuenta personal activa pide elegir una organización', () => {
    useAuthStore.setState({
      activeAccount: {
        id: 'personal-1',
        accountType: 'PERSONAL',
        organizationId: null,
        roleId: 'role-1',
      },
    });

    renderView();

    expect(
      screen.getByText(/selecciona una organización para ver su información/i),
    ).toBeInTheDocument();
    expect(mockedGetOrganization).not.toHaveBeenCalled();
  });
});
