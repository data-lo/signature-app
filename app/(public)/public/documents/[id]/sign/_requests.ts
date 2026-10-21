import axios from 'axios';
import { SignatureType } from '@/lib/enums/document';

/**
 * Cliente HTTP del invitado sin cuenta: aparte de `lib/axios` por lo mismo que el de la firma
 * biométrica (no manda la sesión de nadie ni redirige a `/login` ante un error).
 */
const guestClient = axios.create({ baseURL: '/api' });

/** Tipos de firma que se completan en la pantalla pública. */
export type PublicSigningType = SignatureType.BIOMETRIC | SignatureType.Fiel;

/** Lo que la pantalla pública necesita para decidir cómo sigue el invitado. */
export interface PublicSigningInvitation {
  documentName: string;
  /** Correo invitado enmascarado por el backend (`a***@empresa.com`). */
  maskedEmail: string;
  /** Tipo de firma que exige el documento; lo decide el backend. */
  signatureType: SignatureType | null;
  /** El documento sigue pendiente y este firmante no ha respondido. */
  availableForSigning: boolean;
  /** Puede continuar sin cuenta (no tiene cuenta vinculada y su tipo lo admite). */
  guestSigningAllowed: boolean;
}

/**
 * Valida la invitación de un firmante. Sólo se identifica por documento + colaborador: el correo
 * de la URL no se manda.
 *
 * @param documentId - Documento de la invitación.
 * @param invitationReference - Id del colaborador de la invitación.
 * @returns Nombre del documento, correo enmascarado, tipo de firma, disponibilidad y si admite
 *   continuar sin cuenta.
 *
 * @throws {AxiosError} 404 si la invitación no es válida, 400 si la referencia tiene un formato
 *   inválido, 429 si se consultó demasiadas veces.
 *
 * @example
 * ```ts
 * const invitation = await getPublicSigningInvitationRequest('doc-1', 'c-1');
 * ```
 */
export async function getPublicSigningInvitationRequest(
  documentId: string,
  invitationReference: string,
): Promise<PublicSigningInvitation> {
  const { data } = await guestClient.get<PublicSigningInvitation>(
    `/api/v1/public/documents/${documentId}/invitation`,
    { params: { collaboratorId: invitationReference } },
  );
  return data;
}
