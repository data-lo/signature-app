import {
  isDirectoryCollaborator,
  type CollaboratorFormValues,
  type DocumentSignatureType,
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
 * conversión de nombre, no una agregación. Sólo `ADVANCED` cambia de nombre (`FIEL`).
 *
 * @param signatureType - Tipo de firma elegido para el documento.
 * @returns El mismo tipo con el vocabulario del dominio del backend.
 *
 * @example
 * toRequiresDifferentSignatures('ADVANCED'); // 'FIEL'
 * toRequiresDifferentSignatures('BIOMETRIC'); // 'BIOMETRIC'
 */
export function toRequiresDifferentSignatures(
  signatureType: DocumentSignatureType,
): RequiresDifferentSignatures {
  return signatureType === 'ADVANCED' ? 'FIEL' : signatureType;
}

/**
 * Refuerza acá (no solo en el esquema de Zod) la regla de la historia: con firma simple siempre se
 * manda requiresTwoFactorAuth=true "oculto". En firma avanzada y biométrica, la configuración
 * única del documento se aplica a todos los firmantes.
 *
 * Un firmante nunca lleva `taxId`: el flujo avanzado obtiene ese dato del certificado de e.firma
 * al firmar (ver historia "Selección de tipo de firma al crear documentos"), y el simple nunca lo
 * pidió.
 */
export function toCollaboratorPayload(
  collaborator: CollaboratorFormValues,
  signatureType: DocumentSignatureType,
  orderIndex = 0,
  requiresTwoFactorAuth = true,
): CollaboratorPayload {
  /**
   * Un colaborador del Directorio NO manda nombre, apellido, correo ni `addToDirectory` (historia
   * "Enviar colaboradores desde Directorio mediante usuario vinculado al crear un documento"): el
   * backend los resuelve desde `linkedUserId` y no confiaría en los que mandáramos. Uno manual sí
   * los manda, con `addToDirectory` siempre explícito.
   */
  const identity =
    isDirectoryCollaborator(collaborator) && collaborator.linkedUserId
      ? {
          source: 'DIRECTORY' as const,
          linkedUserId: collaborator.linkedUserId,
        }
      : {
          source: 'MANUAL' as const,
          firstName: collaborator.firstName,
          lastName: collaborator.lastName,
          email: collaborator.email,
          addToDirectory: collaborator.addToDirectory ?? false,
        };

  if (collaborator.collaboratorType === 'WITNESS') {
    return identity.source === 'DIRECTORY'
      ? { ...identity, collaboratorType: 'WITNESS', orderIndex }
      : {
          ...identity,
          collaboratorType: 'WITNESS',
          taxId: collaborator.taxId,
          orderIndex,
        };
  }

  return {
    ...identity,
    collaboratorType: 'SIGNER',
    signatures: collaborator.signatures.map((position) => ({
      signatureId: position.id,
      page: position.page,
      xRatio: position.xRatio,
      yRatio: position.yRatio,
      widthRatio: position.widthRatio,
      heightRatio: position.heightRatio,
    })),
    requiresTwoFactorAuth:
      signatureType === 'SIMPLE' ? true : requiresTwoFactorAuth,
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
  requiresTwoFactorAuth: boolean,
): CollaboratorPayload[] {
  return collaborators.map((collaborator, index) =>
    toCollaboratorPayload(
      collaborator,
      signatureType,
      index,
      requiresTwoFactorAuth,
    ),
  );
}
