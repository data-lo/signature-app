import type { CurrentUser } from '@/lib/api/auth';
import type { AccountData } from '@/lib/api/accounts';

export type AccountKind = 'PERSONAL' | 'ORGANIZATION';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

// Slice 1: datos de autenticación y perfil base (cargados desde /users/me)
export interface AuthUser {
  id: string;
  email: string;
  identificationNumber: string;
  name: string;
  lastName: string;
  isConfigured: boolean;
  personalConfigured: boolean;
  signatureConfigured: boolean;
}

// Slice 2: catálogo de cuentas del usuario (cargado desde /accounts/me)
export interface AccountListEntry {
  id: string;
  accountType: AccountKind;
  organizationId: string | null;
  organizationName: string | null;
  roleId: string | null;
  status: AccountStatus;
}

// Slice 3: contexto operativo actual (tenant activo)
export interface ActiveAccount {
  id: string;
  accountType: AccountKind;
  organizationId: string | null;
  roleId: string | null;
}

export interface AuthSlice {
  user: AuthUser | null;
  authToken: string | null;
  // Guard interno para no disparar dos veces el PATCH /me/status mientras
  // está en vuelo; no es parte del contrato público del store.
  consolidationInFlight: boolean;
  setAuth: (token: string, userData: CurrentUser) => void;
  updateOnboardingStatus: (step: 'personal' | 'signature', value: boolean) => void;
  markConsolidating: (value: boolean) => void;
  markConsolidated: () => void;
  logout: () => void;
}

export interface AccountsListSlice {
  accountsList: AccountListEntry[];
  setAccountsList: (accounts: AccountData[]) => void;
  addAccount: (account: AccountData) => void;
}

export interface ActiveAccountSlice {
  activeAccount: ActiveAccount | null;
  setActiveAccount: (account: AccountListEntry | ActiveAccount) => void;
}

export type AuthState = AuthSlice & AccountsListSlice & ActiveAccountSlice;
