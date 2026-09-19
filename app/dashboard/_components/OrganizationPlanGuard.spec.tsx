import { act, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import { getBillingAccessRequest } from '@/lib/api/billing';
import {
  ORGANIZATION_WITHOUT_PLAN,
  buildBillingAccess,
} from '@/lib/api/billing.fixtures';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AccountListEntry } from '@/lib/store/types/auth-store.types';
import type { BillingAccess } from '@/lib/api/billing';
import OrganizationPlanGuard, {
  ORGANIZATION_WITHOUT_PLAN_MESSAGE,
} from './OrganizationPlanGuard';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockPathname = '/dashboard/documents';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => mockPathname,
}));
jest.mock('@/lib/api/billing');

const mockedGetBillingAccess = getBillingAccessRequest as jest.Mock;

const PERSONAL: AccountListEntry = {
  id: 'personal-1',
  accountType: 'PERSONAL',
  organizationId: null,
  organizationName: null,
  roleId: 'OWNER',
  status: 'ACTIVE',
};

const ORG: AccountListEntry = {
  id: 'org-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  organizationName: 'Acme Corp S.A. de C.V.',
  roleId: 'OWNER',
  status: 'ACTIVE',
};

const PERSONAL_WITH_PLAN = buildBillingAccess({ currentPlanType: 'plus' });

const PROTECTED_CONTENT = 'Contenido protegido';

/** Cuentas para las que se pidió el estado comercial, en orden. */
let requestedFor: string[];

/**
 * Deja una cuenta como activa en el store, como lo haría el selector.
 *
 * @param entry - Cuenta del catálogo a activar.
 * @returns Nada.
 *
 * @example
 * activate(ORG);
 */
function activate(entry: AccountListEntry): void {
  useAuthStore.setState({
    activeAccount: {
      id: entry.id,
      accountType: entry.accountType,
      organizationId: entry.organizationId,
      roleId: entry.roleId,
    },
  });
}

/**
 * Hace que el backend responda, para cada cuenta, el estado comercial indicado.
 *
 * @param byAccountId - Respuesta por id de cuenta activa en el momento de la petición.
 * @returns Nada.
 *
 * @example
 * respondBilling({ 'org-1': ORGANIZATION_WITHOUT_PLAN });
 */
function respondBilling(byAccountId: Record<string, BillingAccess>): void {
  mockedGetBillingAccess.mockImplementation(async () => {
    const accountId = useAuthStore.getState().activeAccount!.id;
    requestedFor.push(accountId);
    return byAccountId[accountId];
  });
}

/**
 * Monta la guarda con contenido protegido y el selector de cuentas al lado.
 *
 * @returns El resultado del render.
 *
 * @example
 * renderGuard();
 */
function renderGuard() {
  return renderWithProviders(
    <OrganizationPlanGuard>
      <p>{PROTECTED_CONTENT}</p>
    </OrganizationPlanGuard>,
  );
}

describe('OrganizationPlanGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestedFor = [];
    mockPathname = '/dashboard/documents';
    useAuthStore.setState({
      accountsList: [PERSONAL, ORG],
      billingByAccountId: {},
    });
    activate(PERSONAL);
    respondBilling({
      [PERSONAL.id]: PERSONAL_WITH_PLAN,
      [ORG.id]: ORGANIZATION_WITHOUT_PLAN,
    });
  });

  it('muestra el contenido protegido a una cuenta con plan', async () => {
    renderGuard();

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('no muestra contenido protegido mientras la consulta de billing está cargando', () => {
    mockedGetBillingAccess.mockImplementation(() => new Promise(() => {}));

    renderGuard();

    expect(
      screen.getByRole('status', { name: /verificando el plan/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED_CONTENT)).not.toBeInTheDocument();
  });

  it('manda a Planes a una organización sin plan que abre una ruta operativa', async () => {
    activate(ORG);

    renderGuard();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/plans'),
    );
    expect(screen.queryByText(PROTECTED_CONTENT)).not.toBeInTheDocument();
  });

  it.each(['/dashboard/plans', '/dashboard/subscriptions'])(
    'deja abrir %s a una organización sin plan, con un aviso',
    async (pathname) => {
      mockPathname = pathname;
      activate(ORG);

      renderGuard();

      expect(
        await screen.findByText(ORGANIZATION_WITHOUT_PLAN_MESSAGE),
      ).toBeInTheDocument();
      expect(screen.getByText(PROTECTED_CONTENT)).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    },
  );

  /**
   * Quien acaba de crear una organización es su administrador desde ese mismo momento, y la
   * organización nace sin plan: si la guarda lo rebotara a Planes, el rol que el backend le
   * asignó no serviría para nada hasta que pagara.
   */
  it.each([
    '/dashboard/organizations/org-1/members',
    '/dashboard/organization/settings/permissions',
  ])(
    'deja administrar la organización en %s aunque no tenga plan',
    async (pathname) => {
      mockPathname = pathname;
      activate(ORG);

      renderGuard();

      expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    },
  );

  /** Las organizaciones que ya existían nacieron en Free y no pierden su acceso. */
  it('no bloquea a una organización Free existente', async () => {
    activate(ORG);
    respondBilling({
      [ORG.id]: buildBillingAccess({
        currentPlanType: 'free',
        status: 'FREE',
        hasActiveSubscription: false,
      }),
    });

    renderGuard();

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('no bloquea la aplicación si la consulta de billing falla', async () => {
    mockedGetBillingAccess.mockRejectedValue(new Error('billing caído'));

    renderGuard();

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
  });

  /**
   * El ejemplo de la historia: cuenta personal con plan → organización sin plan → de vuelta a la
   * cuenta personal. Cada cambio vuelve a pedir el estado comercial de la cuenta elegida.
   */
  /**
   * El ejemplo de la historia: cuenta personal con plan → organización sin plan → de vuelta a la
   * cuenta personal. Cada cambio vuelve a pedir el estado comercial de la cuenta elegida.
   *
   * El cambio se hace sobre el store y NO pulsando el selector. Desde que la cuenta activa vive
   * en una cookie `HttpOnly`, elegir otra en el selector escribe esa cookie desde el servidor y
   * el layout la baja de vuelta en el render siguiente —un viaje que jsdom no puede recorrer—.
   * Lo que esta prueba mira es cómo reacciona la guarda a que la cuenta activa cambie, que es
   * exactamente lo que se simula aquí; el disparo del selector lo cubre su propia prueba.
   */
  it('bloquea al cambiar a una organización sin plan y restaura los accesos al volver', async () => {
    renderGuard();

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();

    act(() => activate(ORG));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/plans'),
    );
    expect(screen.queryByText(PROTECTED_CONTENT)).not.toBeInTheDocument();

    act(() => activate(PERSONAL));

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
    expect(requestedFor).toEqual([PERSONAL.id, ORG.id, PERSONAL.id]);
  });
});
