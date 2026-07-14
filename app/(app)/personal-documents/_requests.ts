import apiClient from '@/lib/axios';
import type {
  PersonalDocumentsFormValues,
  UpdatePersonalInfoFormValues,
} from './_schemas';

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

export async function updateIneFileRequest(
  signatureId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append('officialFile', file);
  await apiClient.patch(`/signature/${signatureId}`, formData);
}

export async function updateSignatureFileRequest(
  signatureId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append('signatureImage', file);
  await apiClient.patch(`/signature/${signatureId}`, formData);
}

export async function deleteIneFileRequest(signatureId: string): Promise<void> {
  await apiClient.delete(`/signature/${signatureId}/official-file`);
}

export async function deleteSignatureFileRequest(
  signatureId: string,
): Promise<void> {
  await apiClient.delete(`/signature/${signatureId}/signature-image`);
}

export async function updatePersonalInformationRequest(
  values: UpdatePersonalInfoFormValues,
): Promise<void> {
  await apiClient.patch('/user/personal-information', {
    phoneNumber: values.phoneNumber || undefined,
    secondaryEmail: values.secondaryEmail || undefined,
  });
}
