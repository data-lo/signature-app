import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice } from './auth.slice';
import { createAccountsListSlice } from './accounts-list.slice';
import { createActiveAccountSlice } from './active-account.slice';
import { createBillingSlice } from './billing.slice';
import type { AuthState } from './types/auth-store.types';

// createJSONStorage invoca su getter de inmediato (no de forma perezosa) al
// crear el store. En Node (SSR/prerendering de Next.js) no existe la global
// `localStorage`, así que referenciarla directamente lanza un ReferenceError
// que el propio zustand atrapa devolviendo storage=undefined — y sin storage,
// el middleware de persist nunca asigna `api.persist`, rompiendo cualquier
// componente que llame a useAuthStore.persist.* durante el build. Un storage
// no-op en el servidor evita el throw sin afectar el comportamiento en
// cliente (skipHydration ya impide que se lea de él antes de tiempo).
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

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
      ...createBillingSlice(...a),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : noopStorage,
      ),
      partialize: (state) => ({ activeAccount: state.activeAccount }),
      // Next.js renderiza este store en el servidor, donde no existe
      // localStorage; se rehidrata manualmente en el cliente (AuthProvider)
      // para evitar errores de SSR y mismatches de hidratación de React.
      skipHydration: true,
    },
  ),
);
