import apiClient from '@/lib/axios';
import { DocumentStatus } from '@/lib/enums/document';

export interface PublicDocumentView {
  id: string;
  fileName: string;
  status: DocumentStatus;
  /** Solo viene resuelta cuando status es Signed — el backend nunca genera esta URL para otro estatus. */
  secureUrl: string | null;
  expiresIn: number | null;
}

export async function getPublicDocumentRequest(
  documentId: string,
): Promise<PublicDocumentView> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: PublicDocumentView;
  }>(`/document/public/${documentId}`);

  return data.data;
}
