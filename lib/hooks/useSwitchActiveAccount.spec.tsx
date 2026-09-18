import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useSwitchActiveAccount } from '@/lib/hooks/useSwitchActiveAccount';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock(
  '@/app/server-actions/accounts/switch-active-account.server-action',
  () => ({ switchActiveAccountAction: jest.fn() }),
);

const mockedSwitchAction = switchActiveAccountAction as jest.Mock;

const CURRENT_CONTEXT: AuthorizationContext = {
  accountId: 'account-org',
  accountType: 'ORGANIZATION',
  organizationId: 'org-1',
  roleId: 'role-admin',
  permissions: ['BILLING.READ', 'BILLING.MANAGE', 'MEMBER.READ'],
};

const TARGET_ACCOUNT = {
  id: 'account-personal',
  accountType: 'PERSONAL' as const,
  organizationId: null,
  roleId: 'role-owner',
};

/**
 * Enseña los permisos vigentes y ofrece el botón de cambio. Es lo mínimo para poder afirmar QUÉ
 * se ve en cada momento del cambio, que es lo que la historia pide comprobar.
 */
function Harness() {
  const { authorization } = usePermissions();
  const { switchActiveAccount, isSwitching } = useSwitchActiveAccount();

  return (
    <div>
      <p data-testid="permisos">
        {(authorization?.permissions ?? []).join(',') || 'ninguno'}
      </p>
      <p data-testid="cambiando">{isSwitching ? 'sí' : 'no'}</p>
      <button onClick={() => void switchActiveAccount(TARGET_ACCOUNT)}>
        Cambiar de cuenta
      </button>
    </div>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Caché de las dos cuentas implicadas y de una tercera que NO debe tocarse.
  queryClient.setQueryData(['billingAccess', 'account-org'], { plan: 'pro' });
  queryClient.setQueryData(['documents', 'account-org', {}], ['doc-1']);
  queryClient.setQueryData(['billingAccess', 'account-personal'], {
    plan: 'free',
  });
  queryClient.setQueryData(['billingAccess', 'account-tercera'], {
    plan: 'otra',
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PermissionProvider initialContext={CURRENT_CONTEXT}>
        <Harness />
      </PermissionProvider>
    </QueryClientProvider>,
  );

  return queryClient;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSwitchAction.mockResolvedValue({ ok: true });
});

describe('useSwitchActiveAccount', () => {
  it('actualiza la cuenta activa a través de la Server Action', async () => {
    renderHarness();

    await userEvent.click(screen.getByRole('button'));

    expect(mockedSwitchAction).toHaveBeenCalledWith('account-personal');
  });

  /**
   * El criterio de aceptación: los permisos anteriores se eliminan ANTES de cargar los nuevos.
   * Si esto fallara, durante el viaje al servidor la pantalla seguiría ofreciendo lo que la
   * cuenta anterior permitía.
   */
  it('vacía los permisos antes de pedir los nuevos', async () => {
    renderHarness();

    expect(screen.getByTestId('permisos')).toHaveTextContent('BILLING.READ');

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('permisos')).toHaveTextContent('ninguno');
  });

  it('tira el caché de la cuenta anterior y el de la nueva, y respeta el de las demás', async () => {
    const queryClient = renderHarness();

    await userEvent.click(screen.getByRole('button'));

    expect(
      queryClient.getQueryData(['billingAccess', 'account-org']),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(['documents', 'account-org', {}]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(['billingAccess', 'account-personal']),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(['billingAccess', 'account-tercera']),
    ).toEqual({ plan: 'otra' });
  });

  it('refresca el layout para que el servidor resuelva los permisos de la cuenta nueva', async () => {
    renderHarness();

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  /** Cambiar a la cuenta en la que ya se está no hace nada: ni descarta permisos ni recarga. */
  it('ignora el cambio a la cuenta que ya está activa', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PermissionProvider
          initialContext={{ ...CURRENT_CONTEXT, accountId: 'account-personal' }}
        >
          <Harness />
        </PermissionProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(mockedSwitchAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('permisos')).toHaveTextContent('BILLING.READ');
  });

  /**
   * Cuando la cuenta ya no es suya la acción falla, pero igual se refresca: la Server Action ya
   * limpió la cookie, y sin el refresco la pantalla se quedaría sin permisos y sin nadie que se
   * los devolviera.
   */
  it('refresca también cuando el cambio falla', async () => {
    mockedSwitchAction.mockResolvedValue({
      ok: false,
      message: 'Ya no tienes acceso a esa cuenta.',
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderHarness();

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
