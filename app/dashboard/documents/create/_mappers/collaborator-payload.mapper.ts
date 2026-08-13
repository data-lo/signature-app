import type {
  CollaboratorFormValues,
  DocumentSignatureType,
} from '../_schemas';
import type {
  CollaboratorPayload,
  RequiresDifferentSignatures,
} from '../_interfaces/create-document-signatures-request.interface';

/**
 * Traducción de los valores del formulario al payload del backend. Vive fuera de los esquemas y
 * de los componentes porque es la única frontera entre dos contratos distintos
 * (`_schemas` ↔ `_interfaces`): moverla aquí permite testear la traducción sin montar el
 * formulario y evita que un componente "sepa" cómo se llaman los campos del backend.
 */

/**
 * Traduce el tipo de firma del documento al vocabulario del dominio del backend. Ya no se calcula
 * recorriendo a los firmantes (ni existe el resultado `MIX`): desde la historia "Selección de tipo
 * de firma al crear documentos" el tipo es una sola decisión del documento, así que esto es una
 * conversión de nombre, no una agregación.
 */
export function toRequiresDifferentSignatures(
  signatureType: DocumentSignatureType,
): RequiresDifferentSignatures {
  return signatureType === 'ADVANCED' ? 'FIEL' : 'SIMPLE';
}

/**
 * Refuerza acá (no solo en el esquema de Zod) la regla de la historia: con firma simple siempre se
 * manda requiresTwoFactorAuth=true "oculto", sin importar qué haya quedado en el estado del form —
 * el checkbox de 2FA ni siquiera se renderiza en ese flujo (ver CollaboratorFormItem), así que
 * esto es la única fuente de verdad para ese caso.
 *
 * Un firmante nunca lleva `rfc`: el flujo avanzado lo obtiene del certificado de e.firma al firmar
 * (ver historia "Selección de tipo de firma al crear documentos"), y el simple nunca lo pidió.
 */
export function toCollaboratorPayload(
  collaborator: CollaboratorFormValues,
  signatureType: DocumentSignatureType,
  orderIndex = 0,
): CollaboratorPayload {
  if (collaborator.collaboratorType === 'VIEWER') {
    return {
      collaboratorType: 'VIEWER',
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email,
      rfc: collaborator.rfc,
      orderIndex,
    };
  }

  return {
    collaboratorType: 'SIGNER',
    firstName: collaborator.firstName,
    lastName: collaborator.lastName,
    email: collaborator.email,
    signatures: collaborator.signatures.map((position) => ({
      signatureId: position.id,
      page: position.page,
      xRatio: position.xRatio,
      yRatio: position.yRatio,
      widthRatio: position.widthRatio,
      heightRatio: position.heightRatio,
    })),
    requiresTwoFactorAuth:
      signatureType === 'SIMPLE' ? true : collaborator.requiresTwoFactorAuth,
    orderIndex,
  };
}

/**
 * El `orderIndex` de cada colaborador es su posición dentro del arreglo ya reordenado (ver
 * historia "Habilitar ordenamiento Drag and Drop para firmantes requeridos"), así que la lista
 * completa se traduce en bloque y no colaborador por colaborador desde la UI.
 */
export function toCollaboratorPayloads(
  collaborators: CollaboratorFormValues[],
  signatureType: DocumentSignatureType,
): CollaboratorPayload[] {
  return collaborators.map((collaborator, index) =>
    toCollaboratorPayload(collaborator, signatureType, index),
  );
}
