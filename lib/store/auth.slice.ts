import type { StateCreator } from 'zustand';
import type { CurrentUser } from '@/lib/api/auth';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import type { AuthSlice, AuthState } from './types/auth-store.types';

export function derivePersonalConfigured(user: CurrentUser | null): boolean {
  if (!user) return false;
  return !!user.phoneNumber && !!user.secondaryEmail;
}

/**
 * Única pregunta que hay que hacerle a la credencial: ¿puede esta persona firmar con firma
 * Simple? Vive acá y no repartida por las pantallas para que la comparación contra el enum
 * exista una sola vez.
 */
export function isSigningCredentialConfigured(
  status: SigningCredentialStatus | undefined,
): boolean {
  return status === SigningCredentialStatus.Configured;
}

/**
 * Estados en los que la identidad del usuario ya quedó aprobada por Didit: los dos últimos del
 * avance, con o sin la firma PNG registrada. La firma biométrica sólo necesita la identidad (el
 * rostro se compara contra ella), no la rúbrica.
 */
const IDENTITY_VERIFIED_STATUSES: readonly SigningCredentialStatus[] = [
  SigningCredentialStatus.SignaturePending,
  SigningCredentialStatus.Configured,
];

/**
 * Indica si el usuario ya tiene su identidad verificada.
 *
 * Es la condición previa de la firma biométrica: el backend compara el rostro capturado contra
 * la identidad aprobada, y sin ella rechaza abrir la sesión de Didit.
 *
 * @param status - `signingCredentialStatus` del usuario; `undefined` si todavía no se conoce.
 * @returns `true` si la identidad está aprobada; `false` en cualquier otro estado o si se desconoce.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * hasVerifiedIdentity(SigningCredentialStatus.SignaturePending); // true
 * hasVerifiedIdentity(SigningCredentialStatus.IdentityVerificationRequired); // false
 * ```
 */
export function hasVerifiedIdentity(
  status: SigningCredentialStatus | undefined,
): boolean {
  return status !== undefined && IDENTITY_VERIFIED_STATUSES.includes(status);
}

export const createAuthSlice: StateCreator<AuthState, [], [], AuthSlice> = (
  set,
) => ({
  user: null,
  authToken: null,

  setAuth: (token, userData) =>
    set({
      authToken: token,
      user: {
        id: userData.id,
        email: userData.email,
        identificationNumber: userData.nationalId,
        name: userData.firstName,
        lastName: userData.lastName,
        signingCredentialStatus: userData.signingCredentialStatus,
        personalConfigured: derivePersonalConfigured(userData),
      },
    }),

  /**
   * Refleja de inmediato que el usuario acaba de guardar sus datos de contacto, sin esperar a
   * que `/users/me` se vuelva a consultar. No toca la credencial de firma: ésa sólo cambia
   * cuando el backend la mueve.
   */
  setPersonalConfigured: (value) =>
    set((state) =>
      state.user
        ? { user: { ...state.user, personalConfigured: value } }
        : state,
    ),

  logout: () =>
    set({
      authToken: null,
      user: null,
      accountsList: [],
      activeAccount: null,
      // Se vacía junto con el resto: son las cuentas del usuario que se va, y dejarlas haría
      // que la siguiente sesión mostrara el plan de la anterior hasta la primera respuesta.
      billingByAccountId: {},
    }),
});
