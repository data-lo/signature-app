import type {
  CollaboratorFormValues,
  DocumentSignatureType,
} from '../_schemas';

/**
 * Contratos de SOLICITUD de `POST /api/v1/documents/signatures`. Se mantienen separados de los
 * valores del formulario (`_schemas`) a propósito: el formulario habla de "colaboradores con
 * firmas colocadas por arrastre", el backend habla de multipart con JSON serializado y un
 * `orderIndex` calculado — reutilizar una sola interfaz para ambos obligaba a que un cambio de UI
 * arrastrara al backend y viceversa. La traducción entre ambos mundos vive en `_mappers/`.
 */

/**
 * Espejo de `documentData.signatureType` con el vocabulario del dominio del backend (FIEL en vez
 * de ADVANCED). Ya no admite `MIX`: desde la historia "Selección de tipo de firma al crear
 * documentos" el tipo es uno solo por documento, así que "firmas distintas" no es un estado
 * alcanzable. El backend rechaza el payload si este campo contradice a `documentData.signatureType`.
 */
export type RequiresDifferentSignatures = 'SIMPLE' | 'FIEL';

/** Forma exacta que espera el backend por cada ubicación de firma (ver SignaturePositionDto). */
export interface SignaturePositionPayload {
  signatureId: string;
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

/**
 * Forma exacta que espera el backend por cada colaborador (campo `collaborators`). Sin
 * `signatureType`: lo define el documento entero (`DocumentDataPayload.signatureType`). `rfc` solo
 * viaja para VIEWER — a los firmantes ya no se les pide en ningún flujo.
 */
export interface CollaboratorPayload {
  collaboratorType: 'SIGNER' | 'VIEWER';
  firstName: string;
  lastName: string;
  email: string;
  rfc?: string | null;
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
  /** Tipo de firma exigido a TODOS los firmantes del documento — única fuente de verdad del flujo. */
  signatureType: DocumentSignatureType;
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
  signatureType: DocumentSignatureType;
  collaborators: CollaboratorFormValues[];
}
