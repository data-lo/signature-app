/**
 * Contratos de RESPUESTA de `POST /api/v1/documents/signatures`. La entidad devuelta y el sobre
 * (`success`/`message`/`data`) se declaran por separado: `CreatedDocumentSignatures` es lo único
 * que consume la app, y `CreateDocumentSignaturesResponse` documenta la estructura real que
 * viaja por la red — sin `any` ni genéricos anónimos declarados en línea dentro del request.
 */

/** Resumen del documento recién creado y enviado a firma. */
export interface CreatedDocumentSignatures {
  id: string;
  status: string;
  collaboratorsCount: number;
  notificationsCount: number;
  verificationCodesCount: number;
}

/** Sobre completo tal cual lo devuelve el backend para este endpoint. */
export interface CreateDocumentSignaturesResponse {
  success: boolean;
  message: string;
  data: CreatedDocumentSignatures;
}
