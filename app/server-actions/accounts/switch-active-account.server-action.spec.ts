import { revalidatePath } from 'next/cache';

import {
  clearActiveAccountCookie,
  setActiveAccountCookie,
} from '@/lib/authorization/active-account-cookie.server';
import {
  backendRequest,
  BackendRequestError,
} from '@/lib/server/backend-request';

import { switchActiveAccountAction } from './switch-active-account.server-action';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/authorization/active-account-cookie.server', () => ({
  setActiveAccountCookie: jest.fn(),
  clearActiveAccountCookie: jest.fn(),
}));
jest.mock('@/lib/server/backend-request', () => ({
  backendRequest: jest.fn(),
  BackendRequestError: jest.requireActual('@/lib/server/backend-request')
    .BackendRequestError,
}));

const mockedBackendRequest = backendRequest as jest.Mock;
const mockedSetCookie = setActiveAccountCookie as jest.Mock;
const mockedClearCookie = clearActiveAccountCookie as jest.Mock;
const mockedRevalidate = revalidatePath as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Lo que responde `authorization/context` para una cuenta que sí es del usuario. */
const CONTEXT = {
  accountId: 'account-2',
  accountType: 'ORGANIZATION',
  organizationId: 'org-2',
  roleId: 'role-owner',
  roleName: 'OWNER',
  permissions: ['BILLING.READ', 'BILLING.MANAGE'],
};

describe('switchActiveAccountAction', () => {
  it('escribe la cookie y revalida el layout cuando la cuenta es del usuario', async () => {
    mockedBackendRequest.mockResolvedValue(CONTEXT);

    await expect(switchActiveAccountAction('account-2')).resolves.toEqual({
      ok: true,
      context: CONTEXT,
    });

    expect(mockedSetCookie).toHaveBeenCalledWith('account-2');
    expect(mockedRevalidate).toHaveBeenCalledWith('/dashboard', 'layout');
  });

  /**
   * El contexto vuelve tal cual lo resolvió el backend. Quien llama decide con él —al crear una
   * organización se comprueba que quedó como propietario antes de mandarlo a Planes—, así que
   * recortarlo aquí le quitaría justo lo que necesita mirar.
   */
  it('devuelve el contexto que resolvió el backend, sin recortarlo', async () => {
    mockedBackendRequest.mockResolvedValue(CONTEXT);

    const result = await switchActiveAccountAction('account-2');

    expect(result.ok && result.context.roleName).toBe('OWNER');
    expect(result.ok && result.context.permissions).toEqual([
      'BILLING.READ',
      'BILLING.MANAGE',
    ]);
  });

  /**
   * La comprobación es lo primero que ocurre, contra el backend, y la cookie sólo se escribe si
   * pasa. Que el identificador venga del navegador no abre ningún hueco: quien no sea miembro de
   * esa cuenta recibe el 403 del backend y la cookie se queda como estaba.
   */
  it('comprueba la pertenencia ANTES de escribir la cookie', async () => {
    mockedBackendRequest.mockResolvedValue(CONTEXT);

    await switchActiveAccountAction('account-2');

    expect(mockedBackendRequest).toHaveBeenCalledWith('authorization/context', {
      activeAccountId: 'account-2',
    });
    expect(mockedBackendRequest.mock.invocationCallOrder[0]).toBeLessThan(
      mockedSetCookie.mock.invocationCallOrder[0],
    );
  });

  it('no escribe la cookie de una cuenta ajena y limpia la que había', async () => {
    mockedBackendRequest.mockRejectedValue(
      new BackendRequestError(403, 'No tienes acceso a esta cuenta'),
    );

    const result = await switchActiveAccountAction('account-ajena');

    expect(result.ok).toBe(false);
    expect(mockedSetCookie).not.toHaveBeenCalled();
    expect(mockedClearCookie).toHaveBeenCalled();
  });

  /**
   * Un fallo de red no dice nada sobre la pertenencia: la cookie anterior se conserva para no
   * echar al usuario de una cuenta que probablemente siga siendo suya.
   */
  it('ante un fallo de red conserva la cuenta anterior', async () => {
    mockedBackendRequest.mockRejectedValue(
      new BackendRequestError(null, 'fetch failed'),
    );

    const result = await switchActiveAccountAction('account-2');

    expect(result).toEqual({
      ok: false,
      message: 'No se pudo cambiar de cuenta. Intenta de nuevo.',
    });
    expect(mockedSetCookie).not.toHaveBeenCalled();
    expect(mockedClearCookie).not.toHaveBeenCalled();
  });
});
