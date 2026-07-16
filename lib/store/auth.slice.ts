import type { StateCreator } from 'zustand';
import type { CurrentUser } from '@/lib/api/auth';
import type { AuthSlice, AuthState } from './types/auth-store.types';

export function derivePersonalConfigured(user: CurrentUser | null): boolean {
  if (!user) return false;
  return !!user.phoneNumber && !!user.secondaryEmail;
}

export function deriveSignatureConfigured(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.signatureId != null;
}

export const createAuthSlice: StateCreator<AuthState, [], [], AuthSlice> = (
  set,
) => ({
  user: null,
  authToken: null,
  consolidationInFlight: false,

  setAuth: (token, userData) =>
    set({
      authToken: token,
      user: {
        id: userData.id,
        email: userData.email,
        identificationNumber: userData.nationalId,
        name: userData.firstName,
        lastName: userData.lastName,
        isConfigured: userData.isConfigured,
        personalConfigured: derivePersonalConfigured(userData),
        signatureConfigured: deriveSignatureConfigured(userData),
      },
    }),

  updateOnboardingStatus: (step, value) =>
    set((state) => {
      if (!state.user) return state;
      const key =
        step === 'personal' ? 'personalConfigured' : 'signatureConfigured';
      return { user: { ...state.user, [key]: value } };
    }),

  markConsolidating: (value) => set({ consolidationInFlight: value }),

  markConsolidated: () =>
    set((state) => ({
      user: state.user ? { ...state.user, isConfigured: true } : state.user,
      consolidationInFlight: false,
    })),

  logout: () =>
    set({
      authToken: null,
      user: null,
      accountsList: [],
      activeAccount: null,
      consolidationInFlight: false,
    }),
});
