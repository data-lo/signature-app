import apiClient from '@/lib/axios';

export type AccountType = 'PERSONAL' | 'ORGANIZATION';

export interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  createdAt: string;
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
