import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

import { renderWithProviders, screen, waitFor } from '@/test-utils';
import {
  getOrganizationRequest,
  updateOrganizationRequest,
} from '@/lib/api/organizations';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';
import type { OrganizationProfile } from '@/lib/api/organizations';
import OrganizationInformationView, {
  EMPTY_FIELD_LABEL,
  ORGANIZATION_LOAD_ERROR_MESSAGE,
} from './OrganizationInformationView';

import { ORGANIZATION_UPDATED_MESSAGE } from '../_hooks/useUpdateOrganization';

jest.mock('@/lib/api/organizations');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedGetOrganization = getOrganizationRequest as jest.Mock;
const mockedUpdateOrganization = updateOrganizationRequest as jest.Mock;

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
  taxId: 'ACM010101AAA',
  phoneNumber: '5512345678',
  address: 'Av. Reforma 123, CDMX',
  domainAllowed: 'acme.com',
  isActive: true,
  indexDocuments: true,
};

const EXPECTED_FIELDS: [string, string][] = [
  ['Nombre de visualización', 'Acme'],
  ['Razón social', 'Acme Corp S.A. de C.V.'],
  ['RFC', 'ACM010101AAA'],
  ['Teléfono', '5512345678'],
  ['Domicilio', 'Av. Reforma 123, CDMX'],
  ['Dominio permitido', 'acme.com'],
];

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

    expect(await screen.findByLabelText('Nombre de visualización')).toHaveValue(
      'Acme',
    );
    expect(mockedGetOrganization).toHaveBeenCalledWith('org-1');
  });

  /**
   * Los seis campos del formulario que el backend sabe escribir. Sin esta prueba, publicar la
   * lectura y olvidarse de pintar uno pasaría inadvertido: la pantalla seguiría "funcionando".
   *
   * Cada dato es un campo con su etiqueta asociada, como en "Mi información"; por eso se busca
   * por etiqueta y no por texto.
   */
  it('muestra los seis campos del perfil con su etiqueta', async () => {
    renderView();

    await screen.findByLabelText('Nombre de visualización');

    for (const [label, value] of EXPECTED_FIELDS) {
      expect(screen.getByLabelText(label)).toHaveValue(value);
    }
  });

  /**
   * Homologado con "Mi información": sin `ORGANIZATION.UPDATE` los datos se muestran en campos
   * deshabilitados, y la tarjeta no ofrece ninguna acción.
   */
  it('muestra los campos deshabilitados y sin acciones de guardado', async () => {
    renderView();

    await screen.findByLabelText('Nombre de visualización');

    for (const [label] of EXPECTED_FIELDS) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * Misma estructura que `UserInfoCard`: tarjeta de ancho `max-w-3xl` con encabezado y una
   * rejilla que en escritorio va a dos columnas y en móvil se apila en una.
   */
  it('usa la estructura de tarjeta de Información personal', async () => {
    const { container } = renderView();

    await screen.findByLabelText('Nombre de visualización');

    const card = container.querySelector('#organization-info');
    expect(card).toHaveClass('w-full', 'max-w-3xl');
    expect(card).toHaveTextContent('Información de la organización');
    expect(card?.querySelector('[data-slot="card-content"] > div')).toHaveClass(
      'grid',
      'gap-5',
      'md:grid-cols-2',
    );
  });

  /** Un hueco en blanco no distingue un dato que falta de un dato que no se supo pintar. */
  it('marca "Sin capturar" los campos que la organización no tiene', async () => {
    mockedGetOrganization.mockResolvedValue({
      ...ORGANIZATION,
      taxId: null,
      phoneNumber: null,
      address: null,
      domainAllowed: null,
    });

    renderView();

    await screen.findByLabelText('Nombre de visualización');

    for (const label of ['RFC', 'Teléfono', 'Domicilio', 'Dominio permitido']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveValue('');
      expect(field).toHaveAttribute('placeholder', EMPTY_FIELD_LABEL);
    }
    expect(screen.getByLabelText('Razón social')).toHaveValue(
      'Acme Corp S.A. de C.V.',
    );
  });

  it('mientras carga muestra el indicador y ningún dato', () => {
    mockedGetOrganization.mockReturnValue(new Promise(() => {}));

    renderView();

    expect(screen.getByRole('status')).toHaveTextContent(
      /cargando la información de la organización/i,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('si la consulta falla, muestra un error claro', async () => {
    mockedGetOrganization.mockRejectedValue(new Error('500'));

    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ORGANIZATION_LOAD_ERROR_MESSAGE,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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

/**
 * Con `ORGANIZATION.UPDATE` la tarjeta es un formulario: carga lo registrado, valida lo mismo que
 * el backend, guarda sólo lo que cambió y deja la pantalla mostrando lo guardado.
 */
describe('OrganizationInformationView — edición', () => {
  function renderEditableView() {
    return renderWithProviders(<OrganizationInformationView />, {
      permissions: ['ORGANIZATION.READ', 'ORGANIZATION.UPDATE'],
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOrganization.mockResolvedValue(ORGANIZATION);
    mockedUpdateOrganization.mockImplementation(
      async (_id: string, payload: Record<string, unknown>) => ({
        ...ORGANIZATION,
        ...payload,
      }),
    );
    useAuthStore.setState({
      activeAccount: ORG_ACCOUNT,
      accountsList: [
        {
          id: 'org-account-1',
          accountType: 'ORGANIZATION',
          organizationId: 'org-1',
          organizationName: 'Acme Corp S.A. de C.V.',
          organizationDisplayName: 'Acme',
          organizationIndexDocuments: true,
          roleId: 'admin-role-1',
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('carga los datos registrados en campos editables', async () => {
    renderEditableView();

    await screen.findByLabelText('Nombre de visualización');

    for (const [label, value] of EXPECTED_FIELDS) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveValue(value);
      expect(field).toBeEnabled();
    }
  });

  it('no deja guardar mientras no haya cambios', async () => {
    renderEditableView();

    await screen.findByLabelText('Nombre de visualización');

    expect(
      screen.getByRole('button', { name: /guardar cambios/i }),
    ).toBeDisabled();
  });

  it('guarda sólo el campo modificado, confirma y muestra lo guardado', async () => {
    const user = userEvent.setup();
    renderEditableView();

    const phone = await screen.findByLabelText('Teléfono');
    await user.clear(phone);
    await user.type(phone, '5587654321');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(mockedUpdateOrganization).toHaveBeenCalledWith('org-1', {
        phoneNumber: '5587654321',
      }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(ORGANIZATION_UPDATED_MESSAGE),
    );
    expect(screen.getByLabelText('Teléfono')).toHaveValue('5587654321');
    // El formulario se reinicia con lo guardado: ya no hay cambios pendientes.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /guardar cambios/i }),
      ).toBeDisabled(),
    );
  });

  /** Vaciar un opcional es "bórralo": viaja en `null`, no como texto vacío. */
  it('manda en null un campo opcional que se vació', async () => {
    const user = userEvent.setup();
    renderEditableView();

    await user.clear(await screen.findByLabelText('Domicilio'));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(mockedUpdateOrganization).toHaveBeenCalledWith('org-1', {
        address: null,
      }),
    );
  });

  it('manda el RFC en mayúsculas', async () => {
    const user = userEvent.setup();
    renderEditableView();

    const taxId = await screen.findByLabelText('RFC');
    await user.clear(taxId);
    await user.type(taxId, 'xyz020202bbb');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(mockedUpdateOrganization).toHaveBeenCalledWith('org-1', {
        taxId: 'XYZ020202BBB',
      }),
    );
  });

  it.each([
    ['RFC', 'ABC', /el rfc no tiene un formato válido/i],
    ['Teléfono', '55-12', /el teléfono debe tener entre 7 y 15 dígitos/i],
    [
      'Dominio permitido',
      'https://acme',
      /el dominio no tiene un formato válido/i,
    ],
  ])(
    'no guarda y explica el error si %s es inválido',
    async (label, value, message) => {
      const user = userEvent.setup();
      renderEditableView();

      const field = await screen.findByLabelText(label);
      await user.clear(field);
      await user.type(field, value);
      await user.click(
        screen.getByRole('button', { name: /guardar cambios/i }),
      );

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(mockedUpdateOrganization).not.toHaveBeenCalled();
    },
  );

  it('no deja guardar una razón social vacía', async () => {
    const user = userEvent.setup();
    renderEditableView();

    await user.clear(await screen.findByLabelText('Razón social'));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(
      await screen.findByText(/la razón social es obligatoria/i),
    ).toBeInTheDocument();
    expect(mockedUpdateOrganization).not.toHaveBeenCalled();
  });

  /** El selector de cuentas lee el store; sin esto seguiría con el nombre viejo hasta recargar. */
  it('renombra la organización en el catálogo de cuentas', async () => {
    const user = userEvent.setup();
    renderEditableView();

    const displayName = await screen.findByLabelText('Nombre de visualización');
    await user.clear(displayName);
    await user.type(displayName, 'Acme MX');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(useAuthStore.getState().accountsList[0]).toMatchObject({
        organizationDisplayName: 'Acme MX',
        organizationName: 'Acme Corp S.A. de C.V.',
      }),
    );
  });

  it('si el backend rechaza el guardado, lo avisa y conserva lo capturado', async () => {
    mockedUpdateOrganization.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    renderEditableView();

    const phone = await screen.findByLabelText('Teléfono');
    await user.clear(phone);
    await user.type(phone, '5587654321');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Teléfono')).toHaveValue('5587654321');
    expect(
      screen.getByRole('button', { name: /guardar cambios/i }),
    ).toBeEnabled();
  });
});
