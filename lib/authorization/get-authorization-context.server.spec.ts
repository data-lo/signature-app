import {
  backendRequest,
  BackendRequestError,
} from '@/lib/server/backend-request';

import { getActiveAccountIdFromCookie } from './active-account-cookie.server';
import { getAuthorizationContext } from './get-authorization-context.server';

jest.mock('@/lib/server/backend-request', () => ({
  backendRequest: jest.fn(),
  BackendRequestError: jest.requireActual('@/lib/server/backend-request')
    .BackendRequestError,
}));
jest.mock('./active-account-cookie.server', () => ({
  getActiveAccountIdFromCookie: jest.fn(),
}));

const mockedBackendRequest = backendRequest as jest.Mock;
const mockedCookie = getActiveAccountIdFromCookie as jest.Mock;

const ORGANIZATION_CONTEXT = {
  accountId: 'account-org',
  accountType: 'ORGANIZATION' as const,
  organizationId: 'org-1',
  roleId: 'role-admin',
  permissions: ['ORGANIZATION.READ', 'BILLING.READ'],
};

const PERSONAL_CONTEXT = {
  accountId: 'account-personal',
  accountType: 'PERSONAL' as const,
  organizationId: null,
  roleId: 'role-owner',
  permissions: ['DOCUMENT.CREATE', 'DOCUMENT.READ_OWN'],
};

const ACCOUNTS = [
  {
    id: 'account-org',
    type: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'role-admin',
    isActive: true,
  },
  {
    id: 'account-personal',
    type: 'PERSONAL',
    organizationId: null,
    roleId: 'role-owner',
    isActive: true,
  },
];

beforeEach(() => {
  mockedBackendRequest.mockReset();
  mockedCookie.mockReset();
});

describe('getAuthorizationContext', () => {
  it('pide los permisos de la cuenta que dice la cookie', async () => {
    mockedCookie.mockResolvedValue('account-org');
    mockedBackendRequest.mockResolvedValue(ORGANIZATION_CONTEXT);

    const result = await getAuthorizationContext();

    expect(result).toEqual({
      ok: true,
      context: ORGANIZATION_CONTEXT,
      resolvedFromCookie: true,
    });
    expect(mockedBackendRequest).toHaveBeenCalledWith(
      'authorization/context',
      { activeAccountId: 'account-org' },
    );
  });

  /**
   * Primera visita, o alguien que venía de la versión anterior con la cuenta en `localStorage`:
   * sin cookie se resuelve la PERSONAL, que es la regla que aplicaba el cliente. Se marca
   * `resolvedFromCookie: false` para que el puente la confirme desde el navegador — un Server
   * Component no puede escribir cookies.
   */
  it('sin cookie cae a la cuenta personal y avisa de que hay que persistirla', async () => {
    mockedCookie.mockResolvedValue(undefined);
    mockedBackendRequest
      .mockResolvedValueOnce(ACCOUNTS)
      .mockResolvedValueOnce(PERSONAL_CONTEXT);

    const result = await getAuthorizationContext();

    expect(result).toEqual({
      ok: true,
      context: PERSONAL_CONTEXT,
      resolvedFromCookie: false,
    });
    expect(mockedBackendRequest).toHaveBeenNthCalledWith(1, 'accounts/me');
    expect(mockedBackendRequest).toHaveBeenNthCalledWith(
      2,
      'authorization/context',
      { activeAccountId: 'account-personal' },
    );
  });

  /**
   * A quien le revocaron el acceso a una organización mientras la tenía activa: sin este segundo
   * intento se quedaría fuera del dashboard entero teniendo su cuenta personal intacta.
   */
  it('si la cuenta de la cookie ya no es suya, reintenta con la cuenta por defecto', async () => {
    mockedCookie.mockResolvedValue('account-org');
    mockedBackendRequest
      .mockRejectedValueOnce(new BackendRequestError(403, 'No tienes acceso'))
      .mockResolvedValueOnce(ACCOUNTS)
      .mockResolvedValueOnce(PERSONAL_CONTEXT);

    const result = await getAuthorizationContext();

    expect(result).toEqual({
      ok: true,
      context: PERSONAL_CONTEXT,
      resolvedFromCookie: false,
    });
  });

  it('un 401 se reporta como sesión caducada, sin reintentar', async () => {
    mockedCookie.mockResolvedValue('account-org');
    mockedBackendRequest.mockRejectedValue(
      new BackendRequestError(401, 'No hay sesión en la petición'),
    );

    await expect(getAuthorizationContext()).resolves.toEqual({
      ok: false,
      failure: 'UNAUTHENTICATED',
    });
    expect(mockedBackendRequest).toHaveBeenCalledTimes(1);
  });

  /** El backend caído no es "no te toca": es recuperable y la pantalla ofrece reintentar. */
  it('un fallo de red se reporta como recuperable', async () => {
    mockedCookie.mockResolvedValue('account-org');
    mockedBackendRequest.mockRejectedValue(
      new BackendRequestError(null, 'fetch failed'),
    );

    await expect(getAuthorizationContext()).resolves.toEqual({
      ok: false,
      failure: 'UNREACHABLE',
    });
  });

  it('un usuario sin ninguna cuenta activa se reporta como cuenta no disponible', async () => {
    mockedCookie.mockResolvedValue(undefined);
    mockedBackendRequest.mockResolvedValueOnce([
      { ...ACCOUNTS[0], isActive: false },
    ]);

    await expect(getAuthorizationContext()).resolves.toEqual({
      ok: false,
      failure: 'ACCOUNT_UNAVAILABLE',
    });
  });
});
