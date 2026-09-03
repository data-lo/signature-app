import apiClient from '@/lib/axios';
import type {
  ChangePasswordFormValues,
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
  if (values.ineFile) {
    formData.append('officialFile', values.ineFile);
  }
  formData.append('signatureImage', values.signatureFile);

  const { data } = await apiClient.put<{
    success: boolean;
    message: string;
    data: UploadPersonalDocumentsResponseData;
  }>('/api/v1/users/me/signature', formData);

  return data.data;
}

export async function updateIneFileRequest(
  signatureId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append('officialFile', file);
  await apiClient.patch(`/api/v1/signature/${signatureId}`, formData);
}

export async function updateSignatureFileRequest(
  signatureId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append('signatureImage', file);
  await apiClient.patch(`/api/v1/signature/${signatureId}`, formData);
}

export async function deleteIneFileRequest(signatureId: string): Promise<void> {
  await apiClient.delete(`/api/v1/signature/${signatureId}/official-file`);
}

export async function deleteSignatureFileRequest(
  signatureId: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/signature/${signatureId}/signature-image`);
}

export async function updatePersonalInformationRequest(
  values: UpdatePersonalInfoFormValues,
): Promise<void> {
  await apiClient.put('/api/v1/users/me/personal-information', {
    phoneNumber: values.phoneNumber || undefined,
    secondaryEmail: values.secondaryEmail || undefined,
  });
}

/**
 * Manda la confirmación además de la contraseña nueva porque el backend también valida que
 * coincidan (`ChangeMyPasswordDto`): la comprobación del formulario es para el usuario, no un
 * reemplazo de la del servidor.
 */
export async function changePasswordRequest(
  values: ChangePasswordFormValues,
): Promise<void> {
  await apiClient.put('/api/v1/users/me/password', {
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
    confirmPassword: values.confirmPassword,
  });
}
