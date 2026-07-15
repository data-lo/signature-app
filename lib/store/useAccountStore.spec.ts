import { useAccountStore } from './useAccountStore';
import { getAuthToken } from '@/lib/cookies';
import type { AccountData } from '@/lib/api/accounts';

jest.mock('@/lib/cookies', () => ({
  getAuthToken: jest.fn(),
}));

const mockedGetAuthToken = getAuthToken as jest.Mock;

function buildAccount(overrides: Partial<AccountData> = {}): AccountData {
  return {
    id: 'account-1',
    name: 'Acme',
    type: 'ORGANIZATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
    ...overrides,
  };
}

describe('useAccountStore', () => {
  beforeEach(() => {
    mockedGetAuthToken.mockReset();
    localStorage.clear();
    useAccountStore.setState({ authToken: null, activeAccount: null });
  });

  it('hydrateToken lee el token de la cookie hacia el store', () => {
    mockedGetAuthToken.mockReturnValue('jwt-token');

    useAccountStore.getState().hydrateToken();

    expect(useAccountStore.getState().authToken).toBe('jwt-token');
  });

  it('hydrateToken deja authToken en null si no hay cookie', () => {
    mockedGetAuthToken.mockReturnValue(undefined);

    useAccountStore.getState().hydrateToken();

    expect(useAccountStore.getState().authToken).toBeNull();
  });

  it('setActiveAccount sobreescribe la cuenta activa', () => {
    const account = buildAccount();

    useAccountStore.getState().setActiveAccount(account);

    expect(useAccountStore.getState().activeAccount).toEqual(account);
  });

  it('clear resetea authToken y activeAccount', () => {
    mockedGetAuthToken.mockReturnValue('jwt-token');
    useAccountStore.getState().hydrateToken();
    useAccountStore.getState().setActiveAccount(buildAccount());

    useAccountStore.getState().clear();

    expect(useAccountStore.getState().authToken).toBeNull();
    expect(useAccountStore.getState().activeAccount).toBeNull();
  });

  it('setActiveAccount persiste activeAccount en localStorage (no authToken)', () => {
    useAccountStore.getState().setActiveAccount(buildAccount());

    const persisted = JSON.parse(localStorage.getItem('account-storage')!);

    expect(persisted.state.activeAccount).toEqual(buildAccount());
    expect(persisted.state.authToken).toBeUndefined();
  });

  it('persist.rehydrate restaura activeAccount desde localStorage tras un refresh', async () => {
    localStorage.setItem(
      'account-storage',
      JSON.stringify({ state: { activeAccount: buildAccount() }, version: 0 }),
    );

    await useAccountStore.persist.rehydrate();

    expect(useAccountStore.getState().activeAccount).toEqual(buildAccount());
  });
});
