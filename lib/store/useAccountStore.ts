import { create } from 'zustand';
import { getAuthToken } from '@/lib/cookies';
import type { AccountData } from '@/lib/api/accounts';

interface AccountState {
  authToken: string | null;
  activeAccount: AccountData | null;
  hydrateToken: () => void;
  setActiveAccount: (account: AccountData) => void;
  clear: () => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  authToken: null,
  activeAccount: null,
  hydrateToken: () => set({ authToken: getAuthToken() ?? null }),
  setActiveAccount: (account) => set({ activeAccount: account }),
  clear: () => set({ authToken: null, activeAccount: null }),
}));
