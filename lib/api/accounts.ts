import apiClient from '@/lib/axios';

export type AccountType = 'PERSONAL' | 'ORGANIZATION';

export interface AccountData {
  /** UUID de esta membresía/contexto — una fila por usuario × cuenta desde la fusión Account/AccountMember del backend (ver plan de migración ER-V2, Fase 5). */
  id: string;
  type: AccountType;
  createdAt: string;
  /** UUID de la organización (tabla organizations); null para cuentas PERSONAL. Varias filas de Account (una por miembro) comparten el mismo organizationId. */
  organizationId: string | null;
  organizationDetail?: { name: string } | null;
  /** UUID del rol (ver GET /api/v1/roles) del usuario autenticado en esta cuenta; null solo si la membresía no tiene rol vigente. */
  roleId: string | null;
  /** Vigencia de la membresía del usuario autenticado en esta cuenta. */
  isActive: boolean;
}

export interface CreateOrganizationValues {
  name: string;
  organizationName: string;
}

export interface InviteMemberValues {
  email: string;
  roleId: string;
}

export async function getAccountsCatalogRequest(): Promise<AccountData[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: AccountData[];
  }>('/api/v1/accounts/me');

  return data.data;
}

export async function createOrganizationRequest(
  values: CreateOrganizationValues,
): Promise<AccountData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: AccountData;
  }>('/api/v1/organizations', values);

  return data.data;
}

/**
 * Invita a un nuevo miembro a la organización activa (X-Account-Id, inyectado
 * por el interceptor de `apiClient`). Alcance delimitado: el backend solo
 * confirma la recepción — no envía correo ni crea la membresía todavía.
 */
export async function inviteMemberRequest(
  values: InviteMemberValues,
): Promise<void> {
  await apiClient.post('/api/v1/organizations/invite', values);
}
