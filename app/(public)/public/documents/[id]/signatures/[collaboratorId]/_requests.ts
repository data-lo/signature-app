import apiClient from '@/lib/axios';

/**
 * Constancia de una firma avanzada: lo que devuelve el backend al escanear el código QR estampado
 * en el documento (historia "Generar código QR para firmas avanzadas").
 */
export interface AdvancedSignaturePublicView {
  documentId: string;
  fileName: string;
  signerName: string;
  /** Del certificado de e.firma; null en firmas anteriores a que se guardara esa evidencia. */
  rfc: string | null;
  certificateSerialNumber: string | null;
  /** ISO 8601 en UTC — la pantalla lo formatea a la zona horaria de quien consulta. */
  signedAt: string;
}

export async function getAdvancedSignatureRequest(
  documentId: string,
  collaboratorId: string,
): Promise<AdvancedSignaturePublicView> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: AdvancedSignaturePublicView;
  }>(`/document/public/${documentId}/signatures/${collaboratorId}`);

  return data.data;
}
