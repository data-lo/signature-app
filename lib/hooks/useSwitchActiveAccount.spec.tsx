import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { switchActiveAccountAction } from '@/app/server-actions/accounts/switch-active-account.server-action';
import { PermissionProvider } from '@/components/authorization/PermissionProvider';
import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useSwitchActiveAccount } from '@/lib/hooks/useSwitchActiveAccount';
import { useAuthStore } from '@/lib/store/useAuthStore';

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
  roleName: 'ADMIN',
  permissions: ['BILLING.READ', 'BILLING.MANAGE', 'MEMBER.READ'],
};

const TARGET_ACCOUNT = {
  id: 'account-personal',
  accountType: 'PERSONAL' as const,
  organizationId: null,
  roleId: 'role-owner',
};

/** Lo que el servidor resuelve para la cuenta destino y devuelve la Server Action. */
const TARGET_CONTEXT: AuthorizationContext = {
  accountId: 'account-personal',
  accountType: 'PERSONAL',
  organizationId: null,
  roleId: 'role-owner',
  roleName: 'OWNER',
  permissions: ['DOCUMENT.CREATE', 'DOCUMENT.READ_OWN'],
};

/** Lo último que devolvió `switchActiveAccount`, para poder afirmar qué recibe quien la llama. */
let lastResult: unknown;

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
      <button
        onClick={async () => {
          lastResult = await switchActiveAccount(TARGET_ACCOUNT);
        }}
      >
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
  lastResult = undefined;
  useAuthStore.setState({ activeAccount: null });
  mockedSwitchAction.mockResolvedValue({ ok: true, context: TARGET_CONTEXT });
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
    /**
     * La Server Action se deja a medias a propósito: lo que se comprueba es qué se ve MIENTRAS
     * dura el viaje al servidor. Con una acción que resuelve al instante, los permisos nuevos ya
     * estarían puestos al mirar y la prueba pasaría sin comprobar nada.
     */
    let resolveAction: (result: unknown) => void = () => {};
    mockedSwitchAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    renderHarness();

    expect(screen.getByTestId('permisos')).toHaveTextContent('BILLING.READ');

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('permisos')).toHaveTextContent('ninguno');

    await act(async () => {
      resolveAction({ ok: true, context: TARGET_CONTEXT });
    });

    expect(screen.getByTestId('permisos')).toHaveTextContent(
      'DOCUMENT.CREATE,DOCUMENT.READ_OWN',
    );
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

  /**
   * El hueco por el que se colaba el error de la historia: entre escribir la cookie y el render
   * siguiente del layout, el cliente se quedaba sin permisos. Adoptar el contexto que devuelve la
   * Server Action lo cierra, y es lo que permite navegar a otra pantalla justo después.
   */
  it('adopta los permisos que devolvió el servidor sin esperar al render del layout', async () => {
    renderHarness();

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByTestId('permisos')).toHaveTextContent(
      'DOCUMENT.CREATE,DOCUMENT.READ_OWN',
    );
  });

  /**
   * La cuenta activa del store sale del CONTEXTO del servidor y no de lo que se le pasó a la
   * función: es la que el interceptor manda como `X-Account-Id`, así que tiene que decir lo mismo
   * que la cookie.
   */
  it('pone como cuenta activa la que resolvió el servidor', async () => {
    renderHarness();

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    expect(useAuthStore.getState().activeAccount).toEqual({
      id: 'account-personal',
      accountType: 'PERSONAL',
      organizationId: null,
      roleId: 'role-owner',
    });
  });

  it('devuelve el resultado a quien la llamó, con el contexto de la cuenta nueva', async () => {
    renderHarness();

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    expect(lastResult).toEqual({ ok: true, context: TARGET_CONTEXT });
  });

  /**
   * Cuando el cambio falla, la cuenta activa del cliente NO se mueve: es lo que impide que
   * frontend y servidor queden apuntando a cuentas distintas.
   */
  it('no toca la cuenta activa ni los permisos cuando el cambio falla', async () => {
    mockedSwitchAction.mockResolvedValue({
      ok: false,
      message: 'No se pudo cambiar de cuenta. Intenta de nuevo.',
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderHarness();

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    expect(useAuthStore.getState().activeAccount).toBeNull();
    expect(lastResult).toEqual({
      ok: false,
      message: 'No se pudo cambiar de cuenta. Intenta de nuevo.',
    });
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
   * Aun sin hacer nada tiene que responder como un cambio logrado: para quien llama la cuenta
   * activa ya es la que pedía, y un fallo le haría tratar como error una situación correcta.
   */
  it('responde ok con el contexto vigente cuando ya se estaba en esa cuenta', async () => {
    const context = { ...CURRENT_CONTEXT, accountId: 'account-personal' };

    render(
      <QueryClientProvider client={new QueryClient()}>
        <PermissionProvider initialContext={context}>
          <Harness />
        </PermissionProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });

    expect(lastResult).toEqual({ ok: true, context });
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
