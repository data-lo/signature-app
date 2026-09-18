import { redirect } from 'next/navigation';

import {
  assertPageAnyPermission,
  assertPagePermission,
  UNAUTHORIZED_ROUTE,
} from './assert-page-permission.server';
import { getAuthorizationContext } from './get-authorization-context.server';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    /**
     * El `redirect` real interrumpe el render lanzando; el doble hace lo mismo para que el
     * código que hay después de él no siga corriendo en la prueba como no sigue en producción.
     */
    throw new Error('NEXT_REDIRECT');
  }),
}));
jest.mock('./get-authorization-context.server', () => ({
  getAuthorizationContext: jest.fn(),
}));

const mockedRedirect = redirect as unknown as jest.Mock;
const mockedGetContext = getAuthorizationContext as jest.Mock;

const BILLING_READER = {
  ok: true,
  resolvedFromCookie: true,
  context: {
    accountId: 'account-1',
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'role-1',
    permissions: ['ORGANIZATION.READ', 'BILLING.READ'],
  },
};

beforeEach(() => {
  mockedRedirect.mockClear();
  mockedGetContext.mockReset();
});

describe('assertPagePermission', () => {
  it('deja pasar y devuelve el contexto cuando el permiso está concedido', async () => {
    mockedGetContext.mockResolvedValue(BILLING_READER);

    await expect(assertPagePermission('BILLING.READ')).resolves.toEqual(
      BILLING_READER.context,
    );
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('manda a acceso denegado cuando falta el permiso', async () => {
    mockedGetContext.mockResolvedValue(BILLING_READER);

    await expect(assertPagePermission('BILLING.MANAGE')).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(mockedRedirect).toHaveBeenCalledWith(UNAUTHORIZED_ROUTE);
  });

  /**
   * Una sesión caducada no es "no te toca": mandar a la pantalla de acceso denegado dejaría al
   * usuario pidiéndole permisos a un administrador cuando lo que necesita es volver a entrar.
   */
  it('manda a /login cuando la sesión caducó', async () => {
    mockedGetContext.mockResolvedValue({
      ok: false,
      failure: 'UNAUTHENTICATED',
    });

    await expect(assertPagePermission('BILLING.READ')).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  it('manda a acceso denegado cuando no hay una cuenta usable', async () => {
    mockedGetContext.mockResolvedValue({
      ok: false,
      failure: 'ACCOUNT_UNAVAILABLE',
    });

    await expect(assertPagePermission('BILLING.READ')).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(mockedRedirect).toHaveBeenCalledWith(UNAUTHORIZED_ROUTE);
  });
});

describe('assertPageAnyPermission', () => {
  /**
   * A la pantalla de documentos llegan los dos alcances de lectura, y exigir uno concreto
   * dejaría fuera a la mitad de quienes deberían entrar.
   */
  it('basta con uno de los permisos pedidos', async () => {
    mockedGetContext.mockResolvedValue({
      ...BILLING_READER,
      context: {
        ...BILLING_READER.context,
        permissions: ['DOCUMENT.READ_ORGANIZATION'],
      },
    });

    await expect(
      assertPageAnyPermission([
        'DOCUMENT.READ_OWN',
        'DOCUMENT.READ_ORGANIZATION',
      ]),
    ).resolves.toBeDefined();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('redirige cuando no tiene ninguno', async () => {
    mockedGetContext.mockResolvedValue({
      ...BILLING_READER,
      context: { ...BILLING_READER.context, permissions: ['MEMBER.READ'] },
    });

    await expect(
      assertPageAnyPermission([
        'DOCUMENT.READ_OWN',
        'DOCUMENT.READ_ORGANIZATION',
      ]),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenCalledWith(UNAUTHORIZED_ROUTE);
  });
});
