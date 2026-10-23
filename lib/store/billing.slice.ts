import type { StateCreator } from 'zustand';
import type { AuthState, BillingSlice } from './types/auth-store.types';

/**
 * Estado comercial conocido, indexado por cuenta.
 *
 * Es un mapa y no un solo objeto porque un usuario tiene varias cuentas a la vez —su cuenta
 * personal y cada organización— y cada una tiene su propio plan, su propio saldo y sus propios
 * beneficios. Guardarlo plano obligaría a
 * vaciarlo en cada cambio de cuenta, y el switcher volvería a parpadear "sin plan" mientras
 * llega la respuesta de una cuenta que ya se había consultado hace un momento.
 *
 * La consulta la sigue haciendo React Query (ver `useBillingAccess`), que es quien sabe cuándo
 * refrescar. Esto es el espejo legible desde cualquier parte del árbol sin montar la consulta:
 * un menú o un guard pueden preguntar "¿esta cuenta tiene plan?" sin disparar una petición ni
 * suscribirse al hook.
 */
export const createBillingSlice: StateCreator<
  AuthState,
  [],
  [],
  BillingSlice
> = (set) => ({
  billingByAccountId: {},

  setBillingAccess: (accountId, billingAccess) =>
    set((state) => ({
      billingByAccountId: {
        ...state.billingByAccountId,
        [accountId]: billingAccess,
      },
    })),
});
