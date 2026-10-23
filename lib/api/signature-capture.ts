import apiClient from '@/lib/axios';
import type { SigningCredentialStatus } from '@/lib/enums/identity';

/**
 * Sesiones de captura de firma: el flujo por el que la rúbrica entra dibujada, desde esta misma
 * pantalla o desde el celular con un QR.
 *
 * Vive en `lib/api/` y no junto a la pantalla porque lo consumen dos rutas de secciones distintas
 * —la de identidad y la pantalla móvil `/signature-capture`— y duplicar los tipos entre ambas
 * dejaría dos definiciones del mismo contrato.
 */

/** Espejo de SIGNATURE_CAPTURE_CHANNEL_ENUM del backend. */
export enum SignatureCaptureChannel {
  /** Se dibuja en la misma computadora donde se inició sesión. */
  Desktop = 'DESKTOP',
  /** Se dibuja en el celular, tras escanear el QR. */
  MobileQr = 'MOBILE_QR',
}

/** Espejo de SIGNATURE_CAPTURE_SESSION_STATUS_ENUM del backend. */
export enum SignatureCaptureSessionStatus {
  Pending = 'PENDING',
  Claimed = 'CLAIMED',
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  Cancelled = 'CANCELLED',
}

/** Estados en los que la captura ya no puede avanzar por sí sola: el sondeo debe detenerse. */
export const TERMINAL_CAPTURE_STATUSES: readonly SignatureCaptureSessionStatus[] =
  [
    SignatureCaptureSessionStatus.Completed,
    SignatureCaptureSessionStatus.Expired,
    SignatureCaptureSessionStatus.Cancelled,
  ];

export interface SignatureCaptureSession {
  id: string;
  channel: SignatureCaptureChannel;
  status: SignatureCaptureSessionStatus;
  expiresAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  /** Firma que produjo este intento; `null` mientras no haya terminado. */
  signatureId: string | null;
  signingCredentialStatus: SigningCredentialStatus;
}

export interface CreatedSignatureCaptureSession {
  id: string;
  channel: SignatureCaptureChannel;
  status: SignatureCaptureSessionStatus;
  expiresAt: string;
  /**
   * Token de un solo uso del QR. El backend lo devuelve SÓLO en esta respuesta y sólo para
   * MOBILE_QR: no se puede volver a consultar, así que pedir otro código rota el anterior.
   */
  token: string | null;
  /** URL que codifica el QR, ya armada por el backend. */
  qrUrl: string | null;
  /** `true` si se devolvió una captura ya abierta en lugar de crear otra. */
  reused: boolean;
}

const BASE = '/api/v1/signature-capture-sessions';

/** Nombre del campo del multipart que el backend espera para el PNG. */
const SIGNATURE_FILE_FIELD = 'signature';

export async function createSignatureCaptureSessionRequest(
  channel: SignatureCaptureChannel,
): Promise<CreatedSignatureCaptureSession> {
  const { data } = await apiClient.post<{
    data: CreatedSignatureCaptureSession;
  }>(BASE, { channel });

  return data.data;
}

/**
 * Canjea el token del QR desde el celular. El backend comprueba que quien reclama sea el mismo
 * usuario que generó la captura, así que un QR ajeno falla aquí.
 */
export async function claimSignatureCaptureSessionRequest(
  token: string,
): Promise<SignatureCaptureSession> {
  const { data } = await apiClient.post<{ data: SignatureCaptureSession }>(
    `${BASE}/claim`,
    { token },
  );

  return data.data;
}

export async function getSignatureCaptureSessionRequest(
  id: string,
): Promise<SignatureCaptureSession> {
  const { data } = await apiClient.get<{ data: SignatureCaptureSession }>(
    `${BASE}/${id}`,
  );

  return data.data;
}

export async function saveHandwrittenSignatureRequest(
  id: string,
  png: Blob,
): Promise<SignatureCaptureSession> {
  const form = new FormData();
  form.append(SIGNATURE_FILE_FIELD, png, 'firma.png');

  const { data } = await apiClient.post<{ data: SignatureCaptureSession }>(
    `${BASE}/${id}/signature`,
    form,
  );

  return data.data;
}

export async function cancelSignatureCaptureSessionRequest(
  id: string,
): Promise<SignatureCaptureSession> {
  const { data } = await apiClient.post<{ data: SignatureCaptureSession }>(
    `${BASE}/${id}/cancel`,
    {},
  );

  return data.data;
}
