import type {
  CollaboratorFormValues,
  SignerFormValues,
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

/** Escenario 3 de la historia: SIMPLE/FIEL si todos los firmantes coinciden, MIX si hay combinación. */
export function computeRequiresDifferentSignatures(
  collaborators: CollaboratorFormValues[],
): RequiresDifferentSignatures {
  const signerTypes = new Set(
    collaborators
      .filter((c): c is SignerFormValues => c.collaboratorType === 'SIGNER')
      .map((c) => c.signatureType),
  );

  if (signerTypes.size <= 1) {
    const onlyType = [...signerTypes][0];
    return onlyType === 'ADVANCED' ? 'FIEL' : 'SIMPLE';
  }
  return 'MIX';
}

/**
 * Refuerza acá (no solo en el esquema de Zod) la regla de la historia: SIMPLE siempre manda
 * requiresTwoFactorAuth=true "oculto", sin importar qué haya quedado en el estado del form — el
 * checkbox de 2FA ni siquiera se renderiza para SIMPLE (ver CollaboratorFormItem), así que esto
 * es la única fuente de verdad para ese caso.
 */
export function toCollaboratorPayload(
  collaborator: CollaboratorFormValues,
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
    rfc: collaborator.signatureType === 'ADVANCED' ? collaborator.rfc : null,
    signatureType: collaborator.signatureType,
    signatures: collaborator.signatures.map((position) => ({
      signatureId: position.id,
      page: position.page,
      xRatio: position.xRatio,
      yRatio: position.yRatio,
      widthRatio: position.widthRatio,
      heightRatio: position.heightRatio,
    })),
    requiresTwoFactorAuth:
      collaborator.signatureType === 'SIMPLE'
        ? true
        : collaborator.requiresTwoFactorAuth,
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
): CollaboratorPayload[] {
  return collaborators.map((collaborator, index) =>
    toCollaboratorPayload(collaborator, index),
  );
}
