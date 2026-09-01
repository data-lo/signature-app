import apiClient from '@/lib/axios';
import { SigningCredentialStatus } from '@/lib/enums/identity';

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  nationalId: string;
  phoneNumber: string | null;
  secondaryEmail: string | null;
  rfc: string | null;
  signatureId: string | null;
  /**
   * Única fuente de verdad sobre qué acciones de firma tiene habilitadas el usuario. El
   * frontend sólo la lee: quien la mueve es el backend, a partir de los eventos de Didit y de
   * las acciones sobre la firma.
   */
  signingCredentialStatus: SigningCredentialStatus;
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
  }>('/api/v1/auth/me');

  return data.data;
}

interface CachedUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  nationalId: string;
  signatureId: string | null;
  signingCredentialStatus: SigningCredentialStatus;
  personalInformation: {
    rfc: string | null;
    phoneNumber: string | null;
    secondaryEmail: string | null;
  };
}

/**
 * Lee /api/v1/users/me (Redis DB 0 por CURP) para hidratar el store de sesión. A diferencia de
 * getCurrentUserRequest no trae URLs prefirmadas de MinIO: sólo los datos de contacto y
 * `signingCredentialStatus`, que es lo que las pantallas necesitan para decidir qué habilitar.
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
    roles: cached.roles,
    nationalId: cached.nationalId,
    phoneNumber: cached.personalInformation.phoneNumber,
    secondaryEmail: cached.personalInformation.secondaryEmail,
    rfc: cached.personalInformation.rfc,
    signatureId: cached.signatureId,
    signingCredentialStatus: cached.signingCredentialStatus,
  };
}
