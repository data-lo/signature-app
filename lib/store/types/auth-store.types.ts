import type { CurrentUser } from '@/lib/api/auth';
import type { AccountData } from '@/lib/api/accounts';
import type { SigningCredentialStatus } from '@/lib/enums/identity';

export type AccountKind = 'PERSONAL' | 'ORGANIZATION';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

// Slice 1: datos de autenticación y perfil base (cargados desde /users/me)
export interface AuthUser {
  id: string;
  email: string;
  identificationNumber: string;
  name: string;
  lastName: string;
  /**
   * Avance de identidad y firma del usuario, tal cual lo reporta el backend. Es lo único que
   * decide si las acciones de firma Simple están habilitadas.
   *
   * Sustituye a `isConfigured` y a la bandera derivada `signatureConfigured`: las tres
   * describían el mismo avance con criterios distintos —fin del onboarding, existencia de la
   * rúbrica, identidad validada— y podían contradecirse entre sí. Un usuario con la rúbrica
   * subida pero con la verificación rechazada tenía `signatureConfigured` en true y aun así el
   * backend le rechazaba la firma.
   */
  signingCredentialStatus: SigningCredentialStatus;
  /** Datos de contacto completos (teléfono y correo secundario). No interviene en la firma. */
  personalConfigured: boolean;
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
  setAuth: (token: string, userData: CurrentUser) => void;
  setPersonalConfigured: (value: boolean) => void;
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
