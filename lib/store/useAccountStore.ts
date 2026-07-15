import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getAuthToken } from '@/lib/cookies';
import type { AccountData } from '@/lib/api/accounts';

interface AccountState {
  authToken: string | null;
  activeAccount: AccountData | null;
  hydrateToken: () => void;
  setActiveAccount: (account: AccountData) => void;
  clear: () => void;
}

// authToken vive en la cookie (fuente de verdad para la sesión); solo
// activeAccount se persiste en localStorage para no duplicar el JWT en un
// segundo almacenamiento más expuesto a XSS.
export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      authToken: null,
      activeAccount: null,
      hydrateToken: () => set({ authToken: getAuthToken() ?? null }),
      setActiveAccount: (account) => set({ activeAccount: account }),
      clear: () => set({ authToken: null, activeAccount: null }),
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeAccount: state.activeAccount }),
      // Next.js renderiza este store en el servidor, donde no existe
      // localStorage; se rehidrata manualmente en el cliente (AccountProvider)
      // para evitar errores de SSR y mismatches de hidratación de React.
      skipHydration: true,
    },
  ),
);
