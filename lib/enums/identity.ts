/**
 * Enums del dominio de identidad y credencial de firma. Espejo de los enums del backend
 * (signature-server/src/user/enums/signing-credential-status.enum.ts y
 * signature-server/src/identity-verification/enums/*) para que la pantalla no compare estados
 * contra magic strings — los valores coinciden con los que la API serializa.
 */

/**
 * Avance global de identidad y firma del usuario (`users.signing_credential_status`).
 *
 * El frontend SÓLO lo lee: nunca lo escribe ni lo deriva por su cuenta. Quien lo mueve es el
 * backend, a partir de los eventos de Didit y de las acciones sobre la firma.
 */
export enum SigningCredentialStatus {
  /** Nunca inició una verificación. */
  IdentityVerificationRequired = 'IDENTITY_VERIFICATION_REQUIRED',
  /** Hay una sesión de Didit abierta y todavía sin empezar. */
  IdentityVerificationPending = 'IDENTITY_VERIFICATION_PENDING',
  /** El usuario está capturando su INE y su selfie dentro del flujo de Didit. */
  IdentityVerificationInProgress = 'IDENTITY_VERIFICATION_IN_PROGRESS',
  /** Didit no pudo decidir automáticamente: revisión manual del proveedor. */
  IdentityVerificationInReview = 'IDENTITY_VERIFICATION_IN_REVIEW',
  /** Rechazo, abandono o expiración: se puede volver a intentar. */
  IdentityVerificationRetryRequired = 'IDENTITY_VERIFICATION_RETRY_REQUIRED',
  /** Bloqueo definitivo: sólo soporte lo levanta. */
  IdentityVerificationFailed = 'IDENTITY_VERIFICATION_FAILED',
  /** Se agotaron los intentos permitidos. */
  IdentityVerificationMaxAttemptsExceeded = 'IDENTITY_VERIFICATION_MAX_ATTEMPTS_EXCEEDED',
  /** Identidad aprobada: es el único estado en el que el backend acepta la firma PNG. */
  SignaturePending = 'SIGNATURE_PENDING',
  /** Identidad aprobada + firma PNG registrada. */
  Configured = 'CONFIGURED',
}

/** Espejo de IDENTITY_VERIFICATION_STATUS_ENUM: el estado de UN intento, no del usuario. */
export enum IdentityVerificationStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  InReview = 'IN_REVIEW',
  Abandoned = 'ABANDONED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
}

/**
 * Espejo de IDENTITY_CHECK_OUTCOME_ENUM: resultado de una comprobación individual dentro de la
 * verificación (lectura del documento, coincidencia facial, prueba de vida).
 */
export enum IdentityCheckOutcome {
  Passed = 'PASSED',
  Failed = 'FAILED',
  InReview = 'IN_REVIEW',
}

/**
 * Estados en los que la pantalla espera un cambio que llega por webhook, no por una acción del
 * usuario: son los únicos en los que tiene sentido re-consultar el estado cada pocos segundos.
 */
export const IN_FLIGHT_SIGNING_CREDENTIAL_STATUSES: readonly SigningCredentialStatus[] = [
  SigningCredentialStatus.IdentityVerificationPending,
  SigningCredentialStatus.IdentityVerificationInProgress,
  SigningCredentialStatus.IdentityVerificationInReview,
];
