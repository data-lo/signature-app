import axios from 'axios';
import type {
  BiometricGeolocation,
  BiometricSignatureSession,
} from '@/lib/biometric-signature';
import type { SignaturePosition } from '../signing-session';

/**
 * Cliente de la invitación individual y de la sesión pública de firma. Va aparte de `lib/axios`:
 * no manda la sesión de la plataforma ni redirige a `/login` ante un 401 (aquí un 401 sólo
 * significa que el acceso o la sesión vencieron).
 *
 * La autenticación son dos cookies `HttpOnly` que pone y lee el backend (la de acceso a la
 * invitación y la de la sesión); esta pantalla nunca las ve ni las manda a mano. Viajan solas
 * porque las peticiones son del mismo origen (proxy `/api` de Next).
 */
const signingClient = axios.create({ baseURL: '/api', withCredentials: true });

const INVITATIONS = '/api/v1/public/signing-invitations';
const LAUNCHES = '/api/v1/public/signing-launches';
const SESSION = '/api/v1/public/signing-sessions/current';

/** Estado de una invitación, tal como lo resuelve el backend. */
export type InvitationStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ALREADY_SIGNED'
  | 'DOCUMENT_CANCELLED'
  | 'UNAVAILABLE'
  | 'WAITING_FOR_PREVIOUS_SIGNER';

/** Contexto mínimo de una invitación: sin PDF ni ids. Sólo `ACTIVE` trae algo más que el estado. */
export interface InvitationContext {
  status: InvitationStatus;
  document?: { name: string };
  signer?: {
    /** Correo de la invitación, enmascarado. El completo nunca llega a la pantalla. */
    maskedEmail: string;
    accountStatus: 'ACTIVE' | 'PROVISIONED' | null;
    /** Puede firmar desde la invitación, sin iniciar sesión en la plataforma. */
    publicSigningAllowed: boolean;
  };
  signature?: {
    type: string;
    requiresEmailVerification: boolean;
    requiresIdentityValidation: boolean;
  };
  expiresAt?: string;
}

/** Contexto completo de la sesión pública de firma. */
export interface CurrentSigningSession {
  document: {
    name: string;
    status: string;
    totalPages: number;
    documentHash: string | null;
  };
  signer: {
    maskedEmail: string;
    status: string;
    canSign: boolean;
    accountStatus: 'ACTIVE' | 'PROVISIONED' | null;
  };
  signature: {
    type: string;
    emailVerified: true;
    requiresIdentityValidation: boolean;
    /** Sólo firma simple: credencial del usuario provisional (`SigningCredentialStatus`). */
    credentialStatus: string | null;
  };
  positions: SignaturePosition[];
  session: { expiresAt: string };
}

/** Respuesta de una firma registrada. */
export interface SignedDocumentResponse {
  success: boolean;
  message: string;
  data: { id: string; documentCompleted: boolean };
}

/**
 * Canjea el token de la invitación del correo (`/sign/:token`). Si se puede seguir, el backend
 * deja la cookie de acceso a la invitación.
 *
 * @param token - Token de la ruta.
 * @returns El contexto mínimo.
 *
 * @throws {AxiosError} 404 si el token no existe, 429 si se consultó demasiadas veces.
 *
 * @example
 * ```ts
 * const context = await openInvitationRequest(token);
 * ```
 */
export async function openInvitationRequest(
  token: string,
): Promise<InvitationContext> {
  const { data } = await signingClient.post<InvitationContext>(
    `${INVITATIONS}/${encodeURIComponent(token)}/access`,
  );
  return data;
}

/**
 * Canjea el acceso temporal del portal del tercero (`/sign/launch/:token`). Es de un solo uso: el
 * backend lo consume y deja la misma cookie de acceso que el correo.
 *
 * @param token - Token de lanzamiento (`sla_…`).
 * @returns El contexto mínimo.
 *
 * @throws {AxiosError} 404 si el token no existe, venció o ya se usó.
 *
 * @example
 * ```ts
 * const context = await openLaunchRequest('sla_…');
 * ```
 */
export async function openLaunchRequest(
  token: string,
): Promise<InvitationContext> {
  const { data } = await signingClient.post<InvitationContext>(
    `${LAUNCHES}/${encodeURIComponent(token)}/access`,
  );
  return data;
}

/**
 * Envía el código al correo de la invitación (cookie de acceso).
 *
 * @returns Correo enmascarado, si el correo salió y cuánto esperar para pedir otro.
 *
 * @throws {AxiosError} 401 si el acceso venció, 404 si la invitación ya no está activa, 429 si se
 *   pidieron demasiados códigos.
 *
 * @example
 * ```ts
 * const { maskedEmail } = await requestInvitationCodeRequest();
 * ```
 */
export async function requestInvitationCodeRequest(): Promise<{
  maskedEmail: string;
  emailDelivered: boolean;
  resendAfterSeconds: number;
}> {
  const { data } = await signingClient.post(`${INVITATIONS}/current/otp`);
  return data;
}

/**
 * Valida el código: el backend abre la sesión pública (cookie) y retira la de acceso.
 *
 * @param code - Código de 6 dígitos.
 * @returns Vencimiento de la sesión.
 *
 * @throws {AxiosError} 400 si el código no coincide o venció, 401 si el acceso venció, 429 si hubo
 *   demasiados intentos.
 *
 * @example
 * ```ts
 * await verifyInvitationCodeRequest('123456');
 * ```
 */
export async function verifyInvitationCodeRequest(
  code: string,
): Promise<{ expiresAt: string }> {
  const { data } = await signingClient.post(
    `${INVITATIONS}/current/otp/verify`,
    {
      code,
    },
  );
  return data;
}

/**
 * Contexto completo de la sesión pública.
 *
 * @returns Documento, firmante, tipo de firma con su credencial y posiciones.
 *
 * @throws {AxiosError} 401 si no hay sesión o venció.
 *
 * @example
 * ```ts
 * const current = await getCurrentSigningSessionRequest();
 * ```
 */
export async function getCurrentSigningSessionRequest(): Promise<CurrentSigningSession> {
  const { data } = await signingClient.get<CurrentSigningSession>(SESSION);
  return data;
}

/**
 * URL temporal del PDF de la sesión.
 *
 * @returns URL prefirmada, su vigencia y el hash del PDF.
 *
 * @throws {AxiosError} 401 si no hay sesión.
 *
 * @example
 * ```ts
 * const { fileUrl } = await getCurrentSigningDocumentRequest();
 * ```
 */
export async function getCurrentSigningDocumentRequest(): Promise<{
  fileUrl: string;
  expiresIn: number;
  documentHash: string | null;
}> {
  const { data } = await signingClient.get(`${SESSION}/document`);
  return data;
}

/**
 * Abre (o retoma) la verificación de identidad de Didit del usuario provisional.
 *
 * @param returnPath - Ruta de la app a la que vuelve Didit (`/sign/session`).
 * @returns La URL hospedada de Didit.
 *
 * @throws {AxiosError} 400 si no es firma simple con usuario provisional, 401 sin sesión.
 *
 * @example
 * ```ts
 * const { url } = await verifyIdentityRequest('/sign/session');
 * ```
 */
export async function verifyIdentityRequest(
  returnPath: string,
): Promise<{ url: string }> {
  const { data } = await signingClient.post(
    `${SESSION}/simple/verify-identity`,
    { returnPath },
  );
  return data;
}

/**
 * Firma simple de la sesión.
 *
 * @param payload - Hash revisado, ubicación y, si falta la rúbrica, su PNG.
 * @param idempotencyKey - Clave del intento; la misma en un reintento.
 * @returns La firma registrada.
 *
 * @throws {AxiosError} 400 si falta la rúbrica o el PDF cambió, 401 sin sesión, 409 si sigue en
 *   curso, 422 si la clave se usó con otra petición.
 *
 * @example
 * ```ts
 * await signSimpleRequest({ documentHash, geolocation, signatureImage }, key);
 * ```
 */
export async function signSimpleRequest(
  payload: {
    documentHash: string;
    geolocation: BiometricGeolocation;
    signatureImage?: Blob;
  },
  idempotencyKey: string,
): Promise<SignedDocumentResponse> {
  const formData = new FormData();
  formData.append('documentHash', payload.documentHash);
  formData.append('geolocation', JSON.stringify(payload.geolocation));
  if (payload.signatureImage) {
    formData.append('signatureImage', payload.signatureImage, 'rubrica.png');
  }
  const { data } = await signingClient.post(
    `${SESSION}/simple/sign`,
    formData,
    {
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  );
  return data;
}

/**
 * Firma Electrónica Avanzada de la sesión.
 *
 * @param payload - `.key`, `.cer`, contraseña, ubicación y hash revisado.
 * @param idempotencyKey - Clave del intento.
 * @returns La firma registrada.
 *
 * @throws {AxiosError} 400/401/409 como la firma simple; 422 si la e.firma no es válida.
 *
 * @example
 * ```ts
 * await signAdvancedRequest({ keyFile, cerFile, password, geolocation, documentHash }, key);
 * ```
 */
export async function signAdvancedRequest(
  payload: {
    keyFile: File;
    cerFile: File;
    password: string;
    geolocation: BiometricGeolocation;
    documentHash: string;
  },
  idempotencyKey: string,
): Promise<SignedDocumentResponse> {
  const formData = new FormData();
  formData.append('key', payload.keyFile);
  formData.append('cer', payload.cerFile);
  formData.append('password', payload.password);
  formData.append('geolocation', JSON.stringify(payload.geolocation));
  formData.append('documentHash', payload.documentHash);
  const { data } = await signingClient.post(
    `${SESSION}/advanced/sign`,
    formData,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

/**
 * Inicia (o retoma) la firma biométrica de la sesión: abre Didit.
 *
 * @param geolocation - Ubicación del dispositivo.
 * @param idempotencyKey - Clave del intento.
 * @returns La sesión de Didit.
 *
 * @throws {AxiosError} 400 si no es biométrica, 401 sin sesión, 502 si Didit falló.
 *
 * @example
 * ```ts
 * await startBiometricSigningRequest(coords, key);
 * ```
 */
export async function startBiometricSigningRequest(
  geolocation: BiometricGeolocation,
  idempotencyKey: string,
): Promise<BiometricSignatureSession> {
  const { data } = await signingClient.post(
    `${SESSION}/biometric/sign`,
    { geolocation, biometricConsent: true },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

/**
 * Último intento biométrico de la sesión.
 *
 * @returns La sesión de Didit, o `null` si nunca inició una.
 *
 * @throws {AxiosError} 401 sin sesión.
 *
 * @example
 * ```ts
 * const attempt = await getBiometricSigningStatusRequest();
 * ```
 */
export async function getBiometricSigningStatusRequest(): Promise<BiometricSignatureSession | null> {
  const { data } = await signingClient.get<BiometricSignatureSession | ''>(
    `${SESSION}/biometric`,
  );
  // Nest responde `null` como cuerpo vacío.
  return data || null;
}
