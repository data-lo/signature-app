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

// Nada de este store se persiste ya. `authToken` y `user` se recargan en cada
// sesión desde la cookie + GET /users/me, y `activeAccount` —lo único que
// llegó a guardarse en localStorage— se mudó a una cookie HttpOnly que sólo el
// servidor lee y escribe: es lo que permite resolver los permisos durante el
// render inicial del dashboard, y de paso deja de existir una copia del tenant
// activo que cualquiera pudiera editar desde el navegador. Aquí `activeAccount`
// queda como espejo en memoria de lo que dijo el servidor (ver
// ActiveAccountBridge), para no reescribir los cuarenta y tantos consumidores
// que lo leen.
//
// El middleware `persist` se conserva con una lista de campos VACÍA en vez de
// quitarse: `AuthProvider` y las pruebas siguen llamando a `useAuthStore.persist.*`,
// y sin el middleware esa API no existe.
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
      partialize: () => ({}),
      // Next.js renderiza este store en el servidor, donde no existe
      // localStorage; se rehidrata manualmente en el cliente (AuthProvider)
      // para evitar errores de SSR y mismatches de hidratación de React.
      skipHydration: true,
    },
  ),
);
