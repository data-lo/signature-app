import { create } from 'zustand';
import type { CurrentUser } from '@/lib/api/auth';

export function derivePersonalConfigured(user: CurrentUser | null): boolean {
  if (!user) return false;
  return !!user.phoneNumber && !!user.secondaryEmail;
}

export function deriveSignatureConfigured(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.signatureId != null;
}

interface OnboardingState {
  user: CurrentUser | null;
  personalConfigured: boolean;
  signatureConfigured: boolean;
  isConfigured: boolean;
  consolidationInFlight: boolean;
  hydrate: (user: CurrentUser) => void;
  markConsolidating: (value: boolean) => void;
  clear: () => void;
}

const initialState = {
  user: null as CurrentUser | null,
  personalConfigured: false,
  signatureConfigured: false,
  isConfigured: false,
  consolidationInFlight: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  hydrate: (user) =>
    set({
      user,
      personalConfigured: derivePersonalConfigured(user),
      signatureConfigured: deriveSignatureConfigured(user),
      isConfigured: user.isConfigured,
    }),
  markConsolidating: (value) => set({ consolidationInFlight: value }),
  clear: () => set({ isConfigured: true, consolidationInFlight: false }),
}));
