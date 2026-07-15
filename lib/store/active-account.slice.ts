import type { StateCreator } from 'zustand';
import type {
  AccountListEntry,
  ActiveAccount,
  ActiveAccountSlice,
  AuthState,
} from './types/auth-store.types';

export const createActiveAccountSlice: StateCreator<
  AuthState,
  [],
  [],
  ActiveAccountSlice
> = (set) => ({
  activeAccount: null,

  setActiveAccount: (account: AccountListEntry | ActiveAccount) =>
    set({
      activeAccount: {
        id: account.id,
        accountType: account.accountType,
        organizationId: account.organizationId,
        roleId: account.roleId,
      },
    }),
});
