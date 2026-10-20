import axios from 'axios';
import { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';
import type {
  GuestAccess,
  GuestInvitation,
} from '../biometric-signature/_requests';

export type { GuestAccess, GuestInvitation };

/**
 * Cliente HTTP del invitado sin cuenta. Va aparte de `lib/axios` por lo mismo que el biométrico:
 * aquél manda la sesión de quien la tenga en este navegador y redirige a `/login` ante un 401, y
 * aquí un 401 sólo significa que el acceso de invitado ya no sirve.
 */
const guestClient = axios.create({ baseURL: '/api' });

/** Cabecera del token de invitado (ver `GuestSigningAccessGuard` en el backend). */
const GUEST_TOKEN_HEADER = 'X-Guest-Signing-Token';

const base = (documentId: string) =>
  `/api/v1/public/documents/${documentId}/advanced-signature`;

/** Lo que el invitado ve del documento que se le pide firmar con Firma Avanzada. */
export interface GuestAdvancedSigningDocument {
  documentId: string;
  fileName: string;
  documentStatus: DocumentStatus;
  signerStatus: ParticipantStatus;
  canSign: boolean;
  /** Hash del PDF vigente; se devuelve al firmar para no firmar algo distinto de lo leído. */
  documentHash: string | null;
  fileUrl: string;
  expiresIn: number;
}

/** Ubicación declarada por el dispositivo, evidencia de la firma. */
export interface GuestAdvancedGeolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/** Lo que envía el invitado para firmar con su e.firma. */
export interface GuestAdvancedSignaturePayload {
  keyFile: File;
  cerFile: File;
  password: string;
  geolocation: GuestAdvancedGeolocation;
  documentHash: string;
}

/**
 * Indica si la invitación admite Firma Avanzada sin cuenta.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @returns `true` si el invitado puede firmar sin cuenta.
 *
 * @throws {AxiosError} 429 si se consultó demasiadas veces.
 *
 * @example
 * ```ts
 * await checkGuestAdvancedInvitationRequest('doc-1', { collaboratorId: 'c-1', email: 'ana@correo.mx' });
 * ```
 */
export async function checkGuestAdvancedInvitationRequest(
  documentId: string,
  invitation: GuestInvitation,
): Promise<boolean> {
  const { data } = await guestClient.get<{ guestAdvancedSignature: boolean }>(
    `${base(documentId)}/invitation`,
    { params: invitation },
  );
  return data.guestAdvancedSignature;
}

/**
 * Pide que se envíe un código de acceso al correo de la invitación.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @returns Si el correo salió.
 *
 * @throws {AxiosError} 400 si el documento ya no está pendiente o el invitado ya firmó, 403 si la
 *   invitación no admite firma de invitado o no es su turno, 429 si se pidió muchas veces.
 *
 * @example
 * ```ts
 * const { emailDelivered } = await requestGuestAdvancedAccessCodeRequest('doc-1', invitation);
 * ```
 */
export async function requestGuestAdvancedAccessCodeRequest(
  documentId: string,
  invitation: GuestInvitation,
): Promise<{ emailDelivered: boolean }> {
  const { data } = await guestClient.post<{ emailDelivered: boolean }>(
    `${base(documentId)}/access-code`,
    invitation,
  );
  return data;
}

/**
 * Canjea el código del correo por un acceso temporal.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @param code - Código de 6 dígitos.
 * @returns El token y su vencimiento.
 *
 * @throws {AxiosError} 400 si el código no existe, venció, no coincide o ya se usó; 429 si hubo
 *   muchos intentos.
 *
 * @example
 * ```ts
 * const access = await verifyGuestAdvancedAccessCodeRequest('doc-1', invitation, '123456');
 * ```
 */
export async function verifyGuestAdvancedAccessCodeRequest(
  documentId: string,
  invitation: GuestInvitation,
  code: string,
): Promise<GuestAccess> {
  const { data } = await guestClient.post<GuestAccess>(
    `${base(documentId)}/access-code/verify`,
    { ...invitation, code },
  );
  return data;
}

/**
 * Documento que se le pide firmar al invitado.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado.
 * @returns Nombre, estados, si puede firmar, hash vigente y URL del PDF.
 *
 * @throws {AxiosError} 401 si el acceso venció o se revocó.
 *
 * @example
 * ```ts
 * const document = await getGuestAdvancedSigningDocumentRequest('doc-1', token);
 * ```
 */
export async function getGuestAdvancedSigningDocumentRequest(
  documentId: string,
  accessToken: string,
): Promise<GuestAdvancedSigningDocument> {
  const { data } = await guestClient.get<GuestAdvancedSigningDocument>(
    `${base(documentId)}/document`,
    { headers: { [GUEST_TOKEN_HEADER]: accessToken } },
  );
  return data;
}

/**
 * Firma con e.firma como invitado. La llave y la contraseña sólo viajan en esta petición: el
 * backend no las guarda.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado.
 * @param payload - Archivos, contraseña, ubicación y hash del documento revisado.
 * @returns Si esta firma dejó el documento completo.
 *
 * @throws {AxiosError} 400 si el documento cambió o ya no está pendiente, 401 si el acceso venció,
 *   403 si ya no es una firma de invitado, 422 si la e.firma no es válida.
 *
 * @example
 * ```ts
 * await signGuestAdvancedDocumentRequest('doc-1', token, { keyFile, cerFile, password, geolocation, documentHash });
 * ```
 */
export async function signGuestAdvancedDocumentRequest(
  documentId: string,
  accessToken: string,
  payload: GuestAdvancedSignaturePayload,
): Promise<{ documentCompleted: boolean }> {
  const formData = new FormData();
  formData.append('key', payload.keyFile);
  formData.append('cer', payload.cerFile);
  formData.append('password', payload.password);
  formData.append('geolocation', JSON.stringify(payload.geolocation));
  formData.append('documentHash', payload.documentHash);

  const { data } = await guestClient.post<{
    data: { documentCompleted: boolean };
  }>(`${base(documentId)}/sign`, formData, {
    headers: { [GUEST_TOKEN_HEADER]: accessToken },
  });
  return { documentCompleted: data.data.documentCompleted };
}
