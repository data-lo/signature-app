import type { CollaboratorFormValues } from '../_schemas';

/**
 * Contratos de SOLICITUD de `POST /api/v1/documents/signatures`. Se mantienen separados de los
 * valores del formulario (`_schemas`) a propósito: el formulario habla de "colaboradores con
 * firmas colocadas por arrastre", el backend habla de multipart con JSON serializado y un
 * `orderIndex` calculado — reutilizar una sola interfaz para ambos obligaba a que un cambio de UI
 * arrastrara al backend y viceversa. La traducción entre ambos mundos vive en `_mappers/`.
 */

/** Cómo distinguir el tipo de firma exigido al conjunto de firmantes del documento. */
export type RequiresDifferentSignatures = 'SIMPLE' | 'FIEL' | 'MIX';

/** Forma exacta que espera el backend por cada ubicación de firma (ver SignaturePositionDto). */
export interface SignaturePositionPayload {
  signatureId: string;
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

/** Forma exacta que espera el backend por cada colaborador (campo `collaborators`). */
export interface CollaboratorPayload {
  collaboratorType: 'SIGNER' | 'VIEWER';
  firstName: string;
  lastName: string;
  email: string;
  rfc?: string | null;
  signatureType?: 'SIMPLE' | 'ADVANCED';
  signatures?: SignaturePositionPayload[];
  requiresTwoFactorAuth?: boolean;
  /**
   * Posición final tras el reordenamiento manual (ver historia "Habilitar ordenamiento Drag and
   * Drop para firmantes requeridos") — refleja el índice del colaborador dentro del arreglo ya
   * reordenado (0-based); DocumentSignaturesService lo usa para calcular signingOrder.
   */
  orderIndex: number;
}

/** Campo `documentData` del multipart (serializado como JSON dentro de un campo de texto). */
export interface DocumentDataPayload {
  fileName: string;
  requiresApproval: boolean;
  /** Espejo de `requiresOrder` del formulario, con el nombre que usa el backend. */
  isSequential: boolean;
}

/** Solicitud completa que arma `createDocumentSignaturesRequest` (un solo multipart). */
export interface CreateDocumentSignaturesRequest {
  file: File;
  documentData: DocumentDataPayload;
  collaborators: CollaboratorPayload[];
  requiresDifferentSignatures: RequiresDifferentSignatures;
}

/**
 * Entrada de la mutación (`useCreateDocumentSignatures`), en términos del formulario: es el punto
 * en el que la pantalla entrega lo que capturó el usuario y delega la traducción al payload del
 * backend. Distinta de `CreateDocumentSignaturesRequest` justamente porque todavía no pasó por
 * los mappers.
 */
export interface CreateDocumentSignaturesInput {
  file: File;
  fileName: string;
  requiresApproval: boolean;
  requiresOrder: boolean;
  collaborators: CollaboratorFormValues[];
}
