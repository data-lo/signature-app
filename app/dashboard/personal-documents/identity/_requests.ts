import apiClient from '@/lib/axios';
import type {
  IdentityCheckOutcome,
  IdentityVerificationStatus,
  SigningCredentialStatus,
} from '@/lib/enums/identity';

/**
 * Resumen del veredicto del proveedor. El backend lo filtra a propósito: no trae nombre, número
 * de documento, imágenes ni puntuaciones, sólo cómo salió cada comprobación. Un campo en `null`
 * significa que el proveedor no la reportó, no que haya fallado.
 */
export interface IdentityVerificationChecks {
  documentReading: IdentityCheckOutcome | null;
  faceMatch: IdentityCheckOutcome | null;
  liveness: IdentityCheckOutcome | null;
}

/** Un intento de verificación tal como lo devuelve el backend. */
export interface IdentityVerificationAttempt {
  id: string;
  provider: 'DIDIT';
  status: IdentityVerificationStatus;
  /**
   * URL hospedada de Didit. El backend sólo la expone mientras la sesión sigue abierta y
   * vigente: si llega `null`, no hay nada que abrir ni que convertir en QR y hay que arrancar
   * una verificación nueva.
   */
  url: string | null;
  failureReason: string | null;
  /** `null` mientras el intento no tiene veredicto. */
  checks: IdentityVerificationChecks | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Respuesta de `GET /api/v1/identity-verifications/current`. */
export interface CurrentIdentityVerification {
  verification: IdentityVerificationAttempt | null;
  /** Estado global: es lo que decide qué tarjeta se muestra y qué se habilita. */
  signingCredentialStatus: SigningCredentialStatus;
  /** Conveniencia derivada del backend (`status === CONFIGURED`). */
  signingCredentialConfigured: boolean;
  identityVerifiedAt: string | null;
  signatureRegistered: boolean;
}

/** Respuesta de `POST /api/v1/identity-verifications/didit/session`. */
export interface StartedVerification {
  verificationId: string;
  provider: 'DIDIT';
  status: IdentityVerificationStatus;
  sessionId: string | null;
  /** URL hospedada: se abre en este equipo o se convierte en QR para seguir en el celular. */
  url: string;
  expiresAt: string | null;
  /** `true` si el backend devolvió una sesión ya abierta en lugar de crear otra. */
  reused: boolean;
}

export async function getCurrentIdentityVerificationRequest(): Promise<CurrentIdentityVerification> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: CurrentIdentityVerification;
  }>('/api/v1/identity-verifications/current');

  return data.data;
}

/**
 * @param returnPath A dónde vuelve el usuario cuando Didit termina. Es sólo navegación: el
 *   veredicto llega al backend por webhook firmado, así que manipular este valor no aprueba
 *   ninguna identidad.
 */
export async function startDiditVerificationRequest(
  returnPath: string,
): Promise<StartedVerification> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: StartedVerification;
  }>('/api/v1/identity-verifications/didit/session', { returnPath });

  return data.data;
}
