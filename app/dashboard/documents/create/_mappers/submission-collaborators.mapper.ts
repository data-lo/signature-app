import type { CurrentUser } from '@/lib/api/auth';
import type {
  CollaboratorFormValues,
  CreateDocumentSignaturesFormValues,
  SignerFormValues,
} from '../_schemas';

/**
 * "Incluirme como firmante": el usuario en sesión se convierte en un SIGNER autocompletado con
 * sus datos de perfil y 2FA activo. Firma con el tipo que se eligió para el documento, igual que
 * cualquier otro firmante — no lo declara acá. Nunca pasa por el `useFieldArray` que alimenta el
 * panel de ubicación de firmas (ver `SignaturePlacementField`), así que por construcción no puede
 * tener posiciones colocadas: se agrega recién al enviar.
 */
export function buildSelfSigner(currentUser: CurrentUser): SignerFormValues {
  return {
    collaboratorType: 'SIGNER',
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    requiresTwoFactorAuth: true,
    signatures: [],
  };
}

/**
 * Lista final de colaboradores que se envía: los capturados a mano, más el usuario en sesión si
 * marcó "Incluirme como firmante". Se agrega al final para que su `orderIndex` (calculado por
 * posición en `toCollaboratorPayloads`) respete el orden que el usuario definió por arrastre
 * entre los firmantes manuales. Sin usuario en sesión cargado todavía no se puede autocompletar
 * nada, así que se omite en vez de mandar un firmante vacío.
 */
export function buildSubmissionCollaborators(
  values: CreateDocumentSignaturesFormValues,
  currentUser: CurrentUser | undefined,
): CollaboratorFormValues[] {
  if (!values.includeMeAsSigner || !currentUser) {
    return [...values.collaborators];
  }

  return [...values.collaborators, buildSelfSigner(currentUser)];
}
