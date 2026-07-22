import type { StateCreator } from 'zustand';
import type { AccountData } from '@/lib/api/accounts';
import type {
  AccountListEntry,
  AccountsListSlice,
  AuthState,
} from './types/auth-store.types';

/**
 * Normaliza una Account cruda del backend (GET /api/v1/accounts/me,
 * POST /api/v1/organizations) al shape que consume el store. `roleId` es el
 * UUID real de la membresía en el catálogo RBAC (ver GET /api/v1/roles en
 * signature-server); hoy el backend siempre asigna el rol ADMIN de inmediato
 * al crear una cuenta, así que `null` solo ocurriría ante una membresía sin
 * rol vigente (revocada).
 *
 * `organizationId` viene directo del backend (ya no se deriva de `raw.id`): desde la fusión
 * Account/AccountMember (ver plan de migración ER-V2, Fase 5), `raw.id` identifica la
 * membresía de ESTE usuario, no la organización — varios miembros de una misma organización
 * tienen `raw.id` distintos pero el mismo `raw.organizationId`.
 */
export function toAccountListEntry(raw: AccountData): AccountListEntry {
  return {
    id: raw.id,
    accountType: raw.type,
    organizationId: raw.organizationId,
    organizationName: raw.organizationDetail?.name ?? null,
    roleId: raw.roleId,
    status: raw.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

export const createAccountsListSlice: StateCreator<
  AuthState,
  [],
  [],
  AccountsListSlice
> = (set) => ({
  accountsList: [],

  setAccountsList: (accounts) =>
    set({ accountsList: accounts.map(toAccountListEntry) }),

  addAccount: (account) =>
    set((state) => ({
      accountsList: [...state.accountsList, toAccountListEntry(account)],
    })),
});
