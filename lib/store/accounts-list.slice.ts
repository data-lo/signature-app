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
 */
export function toAccountListEntry(raw: AccountData): AccountListEntry {
  return {
    id: raw.id,
    accountType: raw.type,
    organizationId: raw.type === 'ORGANIZATION' ? raw.id : null,
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
