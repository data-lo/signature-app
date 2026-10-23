import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';

import { renderWithProviders, screen, waitFor } from '@/test-utils';
import {
  getOrganizationRequest,
  updateOrganizationRequest,
  type OrganizationProfile,
} from '@/lib/api/organizations';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';

import OrganizationInformationView from './OrganizationInformationView';
import {
  DOCUMENT_INDEXING_LABEL,
  DOCUMENT_INDEXING_READ_ONLY_MESSAGE,
  DOCUMENT_INDEXING_WARNING,
} from './SmartSearchSettingsCard';
import {
  DOCUMENT_INDEXING_DISABLED_MESSAGE,
  DOCUMENT_INDEXING_ERROR_MESSAGE,
} from '../_hooks/useUpdateDocumentIndexing';

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

function renderView(permissions: PermissionKey[]) {
  return renderWithProviders(<OrganizationInformationView />, { permissions });
}

/** El interruptor por su nombre accesible, que es su rótulo. */
async function findIndexingSwitch() {
  return screen.findByRole('switch', { name: DOCUMENT_INDEXING_LABEL });
}

/**
 * Deja la promesa de la petición en manos de la prueba, para mirar la pantalla mientras guarda.
 *
 * @returns La función que resuelve la petición y la que la rechaza.
 */
function holdUpdateRequest() {
  let resolve!: (organization: OrganizationProfile) => void;
  let reject!: (error: Error) => void;
  mockedUpdateOrganization.mockImplementation(
    () =>
      new Promise<OrganizationProfile>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return {
    resolve: (organization: OrganizationProfile) => resolve(organization),
    reject: (error: Error) => reject(error),
  };
}

describe('SmartSearchSettingsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOrganization.mockResolvedValue(ORGANIZATION);
    mockedUpdateOrganization.mockImplementation(
      async (_id: string, payload: Partial<OrganizationProfile>) => ({
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

  it('aparece debajo de "Información de la organización" con su advertencia', async () => {
    const { container } = renderView(['ORGANIZATION.READ']);

    await findIndexingSwitch();

    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards[0]).toHaveTextContent('Información de la organización');
    expect(cards[1]).toHaveTextContent('Búsqueda inteligente');
    expect(screen.getByText(DOCUMENT_INDEXING_WARNING)).toBeInTheDocument();
  });

  it.each([
    [true, 'activo'],
    [false, 'inactivo'],
  ])('pinta el valor persistido (%s → %s)', async (indexDocuments) => {
    mockedGetOrganization.mockResolvedValue({
      ...ORGANIZATION,
      indexDocuments,
    });

    renderView(['ORGANIZATION.READ']);

    const indexingSwitch = await findIndexingSwitch();
    if (indexDocuments) {
      expect(indexingSwitch).toBeChecked();
    } else {
      expect(indexingSwitch).not.toBeChecked();
    }
  });

  /** Con sólo lectura se ve el valor, pero no se puede cambiar ni se manda nada. */
  it('sin ORGANIZATION.UPDATE el interruptor no se puede cambiar', async () => {
    const user = userEvent.setup();
    renderView(['ORGANIZATION.READ']);

    const indexingSwitch = await findIndexingSwitch();
    expect(indexingSwitch).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(DOCUMENT_INDEXING_READ_ONLY_MESSAGE),
    ).toBeInTheDocument();

    await user.click(indexingSwitch);

    expect(mockedUpdateOrganization).not.toHaveBeenCalled();
    expect(indexingSwitch).toBeChecked();
  });

  it('con ORGANIZATION.UPDATE el interruptor se puede cambiar', async () => {
    renderView(['ORGANIZATION.READ', 'ORGANIZATION.UPDATE']);

    const indexingSwitch = await findIndexingSwitch();
    expect(indexingSwitch).not.toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.queryByText(DOCUMENT_INDEXING_READ_ONLY_MESSAGE),
    ).not.toBeInTheDocument();
  });

  /**
   * Sólo viaja el interruptor —ningún otro campo del perfil— y, al terminar, la pantalla y el
   * catálogo de cuentas reflejan lo que devolvió el backend.
   */
  it('manda sólo indexDocuments, confirma y refresca el perfil y el catálogo', async () => {
    const user = userEvent.setup();
    renderView(['ORGANIZATION.READ', 'ORGANIZATION.UPDATE']);

    await user.click(await findIndexingSwitch());

    await waitFor(() =>
      expect(mockedUpdateOrganization).toHaveBeenCalledWith('org-1', {
        indexDocuments: false,
      }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        DOCUMENT_INDEXING_DISABLED_MESSAGE,
      ),
    );
    expect(await findIndexingSwitch()).not.toBeChecked();
    expect(useAuthStore.getState().accountsList[0]).toMatchObject({
      organizationIndexDocuments: false,
    });
  });

  it('mientras guarda muestra el estado y no deja volver a cambiarlo', async () => {
    const request = holdUpdateRequest();
    const user = userEvent.setup();
    renderView(['ORGANIZATION.READ', 'ORGANIZATION.UPDATE']);

    const indexingSwitch = await findIndexingSwitch();
    await user.click(indexingSwitch);

    expect(await screen.findByRole('status')).toHaveTextContent('Guardando...');
    expect(indexingSwitch).toHaveAttribute('aria-disabled', 'true');

    await user.click(indexingSwitch);
    expect(mockedUpdateOrganization).toHaveBeenCalledTimes(1);

    request.resolve({ ...ORGANIZATION, indexDocuments: false });
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(indexingSwitch).not.toBeChecked();
  });

  /**
   * Si el guardado falla, el interruptor vuelve a lo persistido: nunca se queda mostrando un valor
   * que el backend no aceptó. Ni el perfil en caché ni el catálogo de cuentas cambian.
   */
  it('si el backend rechaza el cambio, lo avisa y restaura el valor persistido', async () => {
    const request = holdUpdateRequest();
    const user = userEvent.setup();
    renderView(['ORGANIZATION.READ', 'ORGANIZATION.UPDATE']);

    const indexingSwitch = await findIndexingSwitch();
    await user.click(indexingSwitch);
    await waitFor(() => expect(indexingSwitch).not.toBeChecked());

    request.reject(new Error('500'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      DOCUMENT_INDEXING_ERROR_MESSAGE,
    );
    expect(indexingSwitch).toBeChecked();
    expect(indexingSwitch).not.toHaveAttribute('aria-disabled', 'true');
    expect(useAuthStore.getState().accountsList[0]).toMatchObject({
      organizationIndexDocuments: true,
    });
  });
});
