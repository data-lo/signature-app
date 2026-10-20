import axios from 'axios';
import { SignatureType } from '@/lib/enums/document';
import type { GuestInvitation } from '../biometric-signature/_requests';

/**
 * Cliente HTTP del invitado sin cuenta: aparte de `lib/axios` por lo mismo que el de la firma
 * biométrica (no manda la sesión de nadie ni redirige a `/login` ante un error).
 */
const guestClient = axios.create({ baseURL: '/api' });

/** Tipos de firma que se completan en la pantalla pública. */
export type PublicSigningType = SignatureType.BIOMETRIC | SignatureType.Fiel;

/**
 * Tipo de firma que el documento le exige al invitado del enlace. Lo decide el backend: el
 * invitado no lo elige.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @returns `BIOMETRIC` o `FIEL`, o `null` si la invitación no se firma en la pantalla pública
 *   (correo distinto, cuenta ya vinculada, firma simple…).
 *
 * @throws {AxiosError} 400 si los datos del enlace tienen un formato inválido, 429 si se consultó
 *   demasiadas veces.
 *
 * @example
 * ```ts
 * await getPublicSigningMethodRequest('doc-1', { collaboratorId: 'c-1', email: 'ana@correo.mx' });
 * ```
 */
export async function getPublicSigningMethodRequest(
  documentId: string,
  invitation: GuestInvitation,
): Promise<PublicSigningType | null> {
  const { data } = await guestClient.get<{
    signatureType: PublicSigningType | null;
  }>(`/api/v1/public/documents/${documentId}/signing-method`, {
    params: invitation,
  });
  return data.signatureType;
}
