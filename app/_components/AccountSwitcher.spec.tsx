import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountSwitcher from './AccountSwitcher';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import { billingAccessQueryKey } from '@/lib/hooks/useBillingAccess';
import type {
  AccountListEntry,
  ActiveAccount,
} from '@/lib/store/types/auth-store.types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
function renderSwitcher() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AccountSwitcher />
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

  it('muestra el nombre de la organización cuando la cuenta activa es ORGANIZATION', () => {
    setActiveAccount(ORG);
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
    expect(
      labels.some((label) => label?.includes('Acme Corp S.A. de C.V.')),
    ).toBe(true);

    const activePersonalItem = items.find((item) =>
      item.textContent?.includes('Mi cuenta personal'),
    );
    expect(activePersonalItem?.textContent).toContain('Actual');
  });

  it('al elegir otra cuenta, la vuelve la activa en el store', async () => {
    const user = userEvent.setup();
    setActiveAccount(PERSONAL);
    renderSwitcher();

    await user.click(screen.getByText('Mi cuenta personal'));
    await user.click(
      await screen.findByRole('menuitem', {
        name: /acme corp s\.a\. de c\.v\./i,
      }),
    );

    expect(useAuthStore.getState().activeAccount?.id).toBe('org-1');
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
      await screen.findByRole('menuitem', { name: /acme corp/i }),
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
