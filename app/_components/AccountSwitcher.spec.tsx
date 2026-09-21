import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountSwitcher from './AccountSwitcher';
import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
/**
 * Cambiar de cuenta ya no lo resuelve el cliente: escribe una cookie `HttpOnly` desde el
 * servidor, así que la Server Action se dobla y lo que se comprueba aquí es que se llame con la
 * cuenta correcta.
 */
jest.mock(
  '@/app/server-actions/accounts/switch-active-account.server-action',
  () => ({ switchActiveAccountAction: jest.fn() }),
);

const mockedSwitchAction = switchActiveAccountAction as jest.Mock;

const PERSONAL: AccountListEntry = {
  id: 'personal-1',
  accountType: 'PERSONAL',
  organizationId: null,
  organizationName: null,
  organizationDisplayName: null,
  roleId: 'OWNER',
  status: 'ACTIVE',
};

/** Los dos nombres distintos a propósito: es lo único que distingue cuál de ellos se rotula. */
const ORG: AccountListEntry = {
  id: 'org-1',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  organizationName: 'Acme Corp S.A. de C.V.',
  organizationDisplayName: 'Acme',
  roleId: 'OWNER',
  status: 'ACTIVE',
};

let queryClient: QueryClient;

/**
 * Deja una cuenta como la activa en el store.
 *
 * @param entry - Cuenta del catálogo, o `null` para ninguna.
 * @returns Nada.
 *
 * @example
 * setActiveAccount(PERSONAL);
 */
function setActiveAccount(entry: AccountListEntry | null) {
  const activeAccount: ActiveAccount | null = entry
    ? {
        id: entry.id,
        accountType: entry.accountType,
        organizationId: entry.organizationId,
        roleId: entry.roleId,
      }
    : null;
  useAuthStore.setState({ activeAccount });
}

/**
 * Monta el selector con un `QueryClient` que la prueba puede inspeccionar.
 *
 * @returns El resultado del render.
 *
 * @example
 * renderSwitcher();
 */
function renderSwitcher(activeAccountId = PERSONAL.id) {
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionProvider
        initialContext={{
          accountId: activeAccountId,
          accountType: 'PERSONAL',
          organizationId: null,
          roleId: 'role-owner',
          roleName: 'OWNER',
          permissions: [],
        }}
      >
        <AccountSwitcher />
      </PermissionProvider>
    </QueryClientProvider>,
  );
}

/**
 * Abre el menú desde la cuenta personal y devuelve la opción "Crear organización".
 *
 * @param user - Sesión de `userEvent`.
 * @returns La opción del menú.
 *
 * @example
 * const option = await openMenu(user);
 */
async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Mi cuenta personal'));
  return screen.findByRole('menuitem', { name: /crear organización/i });
}

describe('AccountSwitcher', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockedSwitchAction.mockReset();
    mockedSwitchAction.mockResolvedValue({
      ok: true,
      context: {
        accountId: ORG.id,
        accountType: 'ORGANIZATION',
        organizationId: 'org-1',
        roleId: 'role-owner',
        roleName: 'OWNER',
        permissions: [],
      },
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({
      accountsList: [PERSONAL, ORG],
      activeAccount: null,
      billingByAccountId: {},
    });
  });

  it('muestra "Cuenta" cuando activeAccount no coincide con ninguna entrada del catálogo', () => {
    setActiveAccount({ ...PERSONAL, id: 'no-existe' });
    renderSwitcher();

    expect(screen.getByText('Cuenta')).toBeInTheDocument();
  });

  it('muestra "Mi cuenta personal" cuando la cuenta activa es PERSONAL', () => {
    setActiveAccount(PERSONAL);
    renderSwitcher();

    expect(screen.getByText('Mi cuenta personal')).toBeInTheDocument();
  });

  /**
   * El nombre de visualización, no la razón social: "Acme" es lo que el alta pide bajo ese
   * rótulo, y el nombre legal completo no cabe ni describe nada en un selector.
   */
  it('rotula una organización con su nombre de visualización', () => {
    setActiveAccount(ORG);
    renderSwitcher();

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(
      screen.queryByText('Acme Corp S.A. de C.V.'),
    ).not.toBeInTheDocument();
  });

  /**
   * Las entradas que quedaron cacheadas en Redis antes de que existiera la columna llegan sin
   * nombre de visualización. Ahí se rotula con la razón social —lo que el selector mostraba hasta
   * ahora— en vez de dejar el hueco.
   */
  it('cae a la razón social cuando no hay nombre de visualización', () => {
    const sinNombreCorto = { ...ORG, organizationDisplayName: null };
    useAuthStore.setState({ accountsList: [PERSONAL, sinNombreCorto] });
    setActiveAccount(sinNombreCorto);
    renderSwitcher();

    expect(screen.getByText('Acme Corp S.A. de C.V.')).toBeInTheDocument();
  });

  it('lista todas las cuentas del catálogo y marca la activa como "Actual"', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    renderSwitcher();

    await user.click(screen.getByText('Mi cuenta personal'));

    const items = await screen.findAllByRole('menuitem');
    const labels = items.map((item) => item.textContent);
    expect(labels.some((label) => label?.includes('Mi cuenta personal'))).toBe(
      true,
    );
    expect(labels.some((label) => label?.includes('Acme'))).toBe(true);

    const activePersonalItem = items.find((item) =>
      item.textContent?.includes('Mi cuenta personal'),
    );
    expect(activePersonalItem?.textContent).toContain('Actual');
  });

  /**
   * El store ya no se escribe desde aquí: la cuenta activa vive en una cookie `HttpOnly`, la
   * cambia la Server Action y el layout la baja de vuelta en el siguiente render. Lo que esta
   * prueba fija es el disparo correcto, no el efecto —que ya no es del cliente.
   */
  it('al elegir otra cuenta, se lo pide al servidor y refresca el layout', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    renderSwitcher();

    await user.click(screen.getByText('Mi cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', {
        name: /acme/i,
      }),
    );

    await waitFor(() =>
      expect(mockedSwitchAction).toHaveBeenCalledWith('org-1'),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  /**
   * Cambiar de cuenta no puede reutilizar lo cacheado de la última visita: se tira y se vuelve a
   * pedir, para que las rutas se habiliten con el estado comercial vigente de esa cuenta.
   */
  it('al elegir otra cuenta, descarta su estado comercial cacheado para volver a consultarlo', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    queryClient.setQueryData(
      billingAccessQueryKey(ORG.id),
      buildBillingAccess({ currentPlanType: 'plus' }),
    );
    renderSwitcher();

    await user.click(screen.getByText('Mi cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', { name: /acme/i }),
    );

    await waitFor(() =>
      expect(
        queryClient.getQueryData(billingAccessQueryKey(ORG.id)),
      ).toBeUndefined(),
    );
  });

  it('"Crear organización" navega a /organization/create', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    renderSwitcher();

    await user.click(await openMenu(user));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/organization/create');
  });

  /**
   * Crear organizaciones ya no depende del plan: la opción está disponible para cualquier usuario,
   * sin bloqueo ni aviso de plan Free.
   */
  describe('creación de organizaciones sin restricción de plan', () => {
    it('está disponible con la cuenta activa en plan Free', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      useAuthStore.setState({
        billingByAccountId: {
          [PERSONAL.id]: buildBillingAccess({
            currentPlanType: 'free',
            hasActiveSubscription: false,
            actions: { organizationAccount: false },
          }),
        },
      });
      renderSwitcher();

      const option = await openMenu(user);
      expect(option).not.toHaveAttribute('aria-disabled', 'true');

      await user.click(option);
      expect(mockPush).toHaveBeenCalledWith('/dashboard/organization/create');
    });

    it('está disponible aunque todavía no se conozca el estado comercial', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      renderSwitcher();

      await user.click(await openMenu(user));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/organization/create');
    });

    it('ya no muestra el aviso "No disponible en plan Free"', async () => {
      const user = userEvent.setup();
      setActiveAccount(PERSONAL);
      renderSwitcher();

      await user.hover(await openMenu(user));

      expect(
        screen.queryByText('No disponible en plan Free'),
      ).not.toBeInTheDocument();
    });
  });
});
