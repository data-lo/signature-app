import axios from 'axios';
import type {
  BiometricGeolocation,
  BiometricSignatureSession,
} from '@/lib/biometric-signature';
import { DocumentStatus, ParticipantStatus } from '@/lib/enums/document';

/**
 * Cliente HTTP del invitado sin cuenta. Va aparte de `lib/axios` a propósito:
 *
 * - aquél manda el `Authorization` y el `X-Account-Id` de quien tenga sesión en este navegador, y
 *   un invitado no actúa como ese usuario;
 * - aquél redirige a `/login` y borra la sesión ante cualquier 401, y aquí un 401 sólo significa
 *   que el acceso de invitado venció: la pantalla vuelve a pedir el código.
 */
const guestClient = axios.create({ baseURL: '/api' });

/** Cabecera del token de invitado (ver `GuestAccessGuard` en el backend). */
const GUEST_TOKEN_HEADER = 'X-Biometric-Guest-Token';

const base = (documentId: string) =>
  `/api/v1/public/documents/${documentId}/biometric-signature`;

/** Datos de la invitación que trae el enlace del correo. Por sí solos no dan acceso. */
export interface GuestInvitation {
  collaboratorId: string;
  email: string;
}

/** Acceso de invitado ya canjeado: token y vencimiento (ISO). */
export interface GuestAccess {
  accessToken: string;
  expiresAt: string;
}

/** Lo que el invitado ve del documento que se le pide firmar. */
export interface GuestSigningDocument {
  documentId: string;
  fileName: string;
  documentStatus: DocumentStatus;
  signerStatus: ParticipantStatus;
  canSign: boolean;
  fileUrl: string;
  expiresIn: number;
}

/**
 * Indica si la invitación admite firma biométrica sin cuenta.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @returns `true` si el invitado puede firmar sin cuenta.
 *
 * @throws {AxiosError} 429 si se consultó demasiadas veces.
 *
 * @example
 * ```ts
 * await checkGuestInvitationRequest('doc-1', { collaboratorId: 'c-1', email: 'ana@correo.mx' });
 * ```
 */
export async function checkGuestInvitationRequest(
  documentId: string,
  invitation: GuestInvitation,
): Promise<boolean> {
  const { data } = await guestClient.get<{ guestBiometric: boolean }>(
    `${base(documentId)}/invitation`,
    { params: invitation },
  );
  return data.guestBiometric;
}

/**
 * Pide que se envíe un código de acceso al correo de la invitación.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @returns Si el correo salió.
 *
 * @throws {AxiosError} 403 si la invitación no admite firma de invitado, 429 si se pidió muchas
 *   veces seguidas.
 *
 * @example
 * ```ts
 * const { emailDelivered } = await requestGuestAccessCodeRequest('doc-1', invitation);
 * ```
 */
export async function requestGuestAccessCodeRequest(
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
 * Canjea el código del correo por un acceso de invitado.
 *
 * @param documentId - Documento de la invitación.
 * @param invitation - Colaborador y correo del enlace.
 * @param code - Código de 6 dígitos.
 * @returns El token y su vencimiento.
 *
 * @throws {AxiosError} 400 si el código no existe, venció o no coincide; 429 si hubo muchos intentos.
 *
 * @example
 * ```ts
 * const access = await verifyGuestAccessCodeRequest('doc-1', invitation, '123456');
 * ```
 */
export async function verifyGuestAccessCodeRequest(
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
 * @returns Nombre, estados, si puede firmar y la URL del PDF.
 *
 * @throws {AxiosError} 401 si el acceso venció.
 *
 * @example
 * ```ts
 * const document = await getGuestSigningDocumentRequest('doc-1', token);
 * ```
 */
export async function getGuestSigningDocumentRequest(
  documentId: string,
  accessToken: string,
): Promise<GuestSigningDocument> {
  const { data } = await guestClient.get<GuestSigningDocument>(
    `${base(documentId)}/document`,
    { headers: { [GUEST_TOKEN_HEADER]: accessToken } },
  );
  return data;
}

/**
 * Inicia —o retoma— la firma biométrica del invitado (KYC de Didit).
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado.
 * @param geolocation - Ubicación del dispositivo, evidencia de la firma.
 * @returns La sesión con la URL de Didit.
 *
 * @throws {AxiosError} 401 si el acceso venció, 400/403 si ya no puede firmar, 502 si Didit falló.
 *
 * @example
 * ```ts
 * const session = await startGuestBiometricSessionRequest('doc-1', token, coords);
 * ```
 */
export async function startGuestBiometricSessionRequest(
  documentId: string,
  accessToken: string,
  geolocation: BiometricGeolocation,
): Promise<BiometricSignatureSession> {
  const { data } = await guestClient.post<BiometricSignatureSession>(
    `${base(documentId)}/session`,
    { geolocation, biometricConsent: true },
    { headers: { [GUEST_TOKEN_HEADER]: accessToken } },
  );
  return data;
}

/**
 * Estado del último intento biométrico del invitado.
 *
 * @param documentId - Documento.
 * @param accessToken - Token de invitado.
 * @returns La sesión del último intento, o `null` si nunca inició una.
 *
 * @throws {AxiosError} 401 si el acceso venció.
 *
 * @example
 * ```ts
 * const session = await getGuestBiometricSessionRequest('doc-1', token);
 * ```
 */
export async function getGuestBiometricSessionRequest(
  documentId: string,
  accessToken: string,
): Promise<BiometricSignatureSession | null> {
  const { data } = await guestClient.get<BiometricSignatureSession | ''>(
    `${base(documentId)}/session`,
    { headers: { [GUEST_TOKEN_HEADER]: accessToken } },
  );
  // Nest responde `null` como cuerpo vacío: sin intento previo llega `''`.
  return data || null;
}
