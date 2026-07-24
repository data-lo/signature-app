import { renderHook } from '@testing-library/react';
import { useOnboardingReady } from './useOnboardingReady';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { AuthUser } from '@/lib/store/types/auth-store.types';

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'juan@empresa.com',
    identificationNumber: 'PELJ850101HDFRNN08',
    name: 'Juan',
    lastName: 'Pérez',
    isConfigured: false,
    personalConfigured: false,
    signatureConfigured: false,
    ...overrides,
  };
}

describe('useOnboardingReady', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('isLoading:true y isReady:false mientras el store no ha hidratado ningún usuario', () => {
    const { result } = renderHook(() => useOnboardingReady());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isReady).toBe(false);
  });

  it('isReady:false si el onboarding está incompleto (ninguna sub-bandera)', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: false, signatureConfigured: false }),
    });
    const { result } = renderHook(() => useOnboardingReady());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it('isReady:false si falta solo una de las dos sub-banderas', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: false }),
    });
    const { result } = renderHook(() => useOnboardingReady());

    expect(result.current.isReady).toBe(false);
  });

  it('isReady:true cuando ambas sub-banderas están en true', () => {
    useAuthStore.setState({
      user: buildUser({ personalConfigured: true, signatureConfigured: true }),
    });
    const { result } = renderHook(() => useOnboardingReady());

    expect(result.current.isReady).toBe(true);
  });

  it('isReady:true cuando isConfigured ya es true (aunque las sub-banderas locales no se hayan recalculado)', () => {
    useAuthStore.setState({
      user: buildUser({
        isConfigured: true,
        personalConfigured: false,
        signatureConfigured: false,
      }),
    });
    const { result } = renderHook(() => useOnboardingReady());

    expect(result.current.isReady).toBe(true);
  });
});
