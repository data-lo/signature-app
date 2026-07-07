import apiClient from '@/lib/axios';
import type { PersonalDocumentsFormValues } from './_schemas';

interface UploadPersonalDocumentsResponseData {
  id: string;
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
