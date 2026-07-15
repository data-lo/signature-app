import apiClient from '@/lib/axios';

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  roles: string[];
  nationalId: string;
  phoneNumber: string | null;
  secondaryEmail: string | null;
  rfc: string | null;
  signatureId: string | null;
  isConfigured: boolean;
  signature?: {
    id: string;
    secureUrl: string;
    expiresIn: number;
  } | null;
  officialFile?: {
    id: string;
    secureUrl: string;
    expiresIn: number;
  } | null;
}

export async function getCurrentUserRequest(): Promise<CurrentUser> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: CurrentUser;
  }>('/auth/me');

  return data.data;
}

interface CachedUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  roles: string[];
  nationalId: string;
  isConfigured: boolean;
  signatureId: string | null;
  personalInformation: {
    rfc: string | null;
    phoneNumber: string | null;
    secondaryEmail: string | null;
  };
}

/**
 * Lee /api/v1/users/me (Redis DB 0 por CURP) para hidratar el store de
 * onboarding. A diferencia de getCurrentUserRequest, no trae URLs prefirmadas
 * de MinIO: solo lo necesario para calcular personalConfigured/signatureConfigured.
 */
export async function getOnboardingProfileRequest(): Promise<CurrentUser> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: CachedUserProfile;
  }>('/api/v1/users/me');

  const cached = data.data;
  return {
    id: cached.id,
    firstName: cached.firstName,
    lastName: cached.lastName,
    email: cached.email,
    position: cached.position,
    roles: cached.roles,
    nationalId: cached.nationalId,
    phoneNumber: cached.personalInformation.phoneNumber,
    secondaryEmail: cached.personalInformation.secondaryEmail,
    rfc: cached.personalInformation.rfc,
    signatureId: cached.signatureId,
    isConfigured: cached.isConfigured,
  };
}
