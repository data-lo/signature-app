import apiClient from '@/lib/axios';
import type { PersonalDocumentsFormValues } from './_schemas';

interface UploadPersonalDocumentsResponseData {
  id: string;
}

export interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  roles: string[];
  nationalId: string;
  signature?: {
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

export async function uploadPersonalDocumentsRequest(
  values: PersonalDocumentsFormValues,
): Promise<UploadPersonalDocumentsResponseData> {
  const formData = new FormData();
  formData.append('officialFile', values.ineFile);
  formData.append('signatureImage', values.signatureFile);

  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: UploadPersonalDocumentsResponseData;
  }>('/signature', formData);

  return data.data;
}
