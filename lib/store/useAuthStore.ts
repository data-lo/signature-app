import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice } from './auth.slice';
import { createAccountsListSlice } from './accounts-list.slice';
import { createActiveAccountSlice } from './active-account.slice';
import type { AuthState } from './types/auth-store.types';

// authToken y user se recargan en cada sesión desde la cookie + GET /users/me
// (fuentes de verdad); solo activeAccount se persiste en localStorage para
// recordar el tenant operativo elegido entre refrescos de página, sin
// duplicar el JWT en un almacenamiento más expuesto a XSS.
export const useAuthStore = create<AuthState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createAccountsListSlice(...a),
      ...createActiveAccountSlice(...a),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeAccount: state.activeAccount }),
      // Next.js renderiza este store en el servidor, donde no existe
      // localStorage; se rehidrata manualmente en el cliente (AuthProvider)
      // para evitar errores de SSR y mismatches de hidratación de React.
      skipHydration: true,
    },
  ),
);
