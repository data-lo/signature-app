import { renderWithProviders, waitFor } from '@/test-utils';
import AuthProvider from './AuthProvider';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useAccountsCatalog } from '@/lib/hooks/useAccountsCatalog';
import { useOnboardingProfile } from '@/lib/hooks/useOnboardingProfile';
import { usePatchUserStatus } from '@/lib/hooks/usePatchUserStatus';
import type { AccountData } from '@/lib/api/accounts';
import type { ActiveAccount } from '@/lib/store/types/auth-store.types';

jest.mock('@/lib/hooks/useAccountsCatalog');
jest.mock('@/lib/hooks/useOnboardingProfile');
jest.mock('@/lib/hooks/usePatchUserStatus');
jest.mock('@/lib/cookies', () => ({ getAuthToken: () => 'jwt-token' }));

const mockedUseAccountsCatalog = useAccountsCatalog as jest.Mock;
const mockedUseOnboardingProfile = useOnboardingProfile as jest.Mock;
const mockedUsePatchUserStatus = usePatchUserStatus as jest.Mock;

const ACCOUNTS: AccountData[] = [
  {
    id: 'personal-1',
    type: 'PERSONAL',
    createdAt: '2026-01-01T00:00:00.000Z',
    organizationId: null,
    organizationDetail: null,
    roleId: 'admin-role-1',
    isActive: true,
  },
  {
    id: 'org-1',
    type: 'ORGANIZATION',
    createdAt: '2026-01-01T00:00:00.000Z',
    organizationId: 'org-1',
    organizationDetail: { name: 'Acme Corp S.A. de C.V.' },
    roleId: 'admin-role-1',
    isActive: true,
  },
];

function buildActiveAccount(overrides: Partial<ActiveAccount>): ActiveAccount {
  return {
    id: 'org-1',
    accountType: 'ORGANIZATION',
    organizationId: 'org-1',
    roleId: 'admin-role-1',
    ...overrides,
  };
}

describe('AuthProvider', () => {
  beforeEach(() => {
    useAuthStore.setState({
      authToken: null,
      user: null,
      consolidationInFlight: false,
      accountsList: [],
      activeAccount: null,
    });
    mockedUseOnboardingProfile.mockReturnValue({ data: undefined });
    mockedUseAccountsCatalog.mockReturnValue({ data: ACCOUNTS });
    mockedUsePatchUserStatus.mockReturnValue({ mutate: jest.fn() });
    jest.spyOn(useAuthStore.persist, 'hasHydrated').mockReturnValue(true);
    jest
      .spyOn(useAuthStore.persist, 'rehydrate')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cae a la cuenta PERSONAL cuando no hay activeAccount (primera sesión)', async () => {
    renderWithProviders(<AuthProvider>hijos</AuthProvider>);

    await waitFor(() => {
      expect(useAuthStore.getState().activeAccount?.id).toBe('personal-1');
    });
  });

  it('revalida y cae a PERSONAL si el activeAccount persistido ya no existe en el catálogo fresco', async () => {
    useAuthStore.setState({
      activeAccount: buildActiveAccount({
        id: 'org-revocada',
        organizationId: 'org-revocada',
      }),
    });

    renderWithProviders(<AuthProvider>hijos</AuthProvider>);

    await waitFor(() => {
      expect(useAuthStore.getState().activeAccount?.id).toBe('personal-1');
    });
  });

  it('no toca activeAccount si sigue siendo válido en el catálogo (p. ej. justo tras crear una organización)', async () => {
    useAuthStore.setState({ activeAccount: buildActiveAccount({}) });

    renderWithProviders(<AuthProvider>hijos</AuthProvider>);

    await waitFor(() => {
      expect(useAuthStore.getState().accountsList.length).toBe(2);
    });

    expect(useAuthStore.getState().activeAccount?.id).toBe('org-1');
  });

  it('bug corregido (SCRUM-12): si PATCH /me/status falla, no reintenta la consolidación en bucle infinito', async () => {
    const mutate = jest.fn((_vars, opts) => opts?.onError?.(new Error('boom')));
    mockedUsePatchUserStatus.mockReturnValue({ mutate });
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'juan@empresa.com',
        identificationNumber: 'PELJ850101HDFRNN08',
        name: 'Juan',
        lastName: 'Pérez',
        isConfigured: false,
        personalConfigured: true,
        signatureConfigured: true,
      },
    });

    renderWithProviders(<AuthProvider>hijos</AuthProvider>);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });

    // Antes del fix, onError dejaba el estado exactamente como antes del intento
    // (consolidationInFlight en false, isConfigured en false), lo que volvía a cumplir la
    // condición de disparo de inmediato y reintentaba mutate() sin límite ni backoff.
    expect(useAuthStore.getState().consolidationInFlight).toBe(false);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
