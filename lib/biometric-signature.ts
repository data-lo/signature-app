import { BiometricSignatureStatus } from '@/lib/enums/document';

/**
 * Sesión de firma biométrica tal como la devuelve el backend, al iniciarla y al consultarla, para
 * firmantes con cuenta y para invitados.
 *
 * `url` es la página de Didit: se abre o se convierte en QR, y sólo viene mientras la sesión sigue
 * abierta y vigente. El veredicto biométrico nunca viaja aquí — llega al backend por webhook.
 */
export interface BiometricSignatureSession {
  attemptId: string;
  status: BiometricSignatureStatus;
  url: string | null;
  expiresAt: string | null;
  /** `true` si el backend devolvió una sesión que ya existía en vez de abrir otra. */
  reused: boolean;
  /** `true` cuando la firma ya quedó registrada. */
  signatureCompleted: boolean;
  /** `true` si con esa firma el documento quedó firmado por todos. */
  documentCompleted: boolean;
}

/** Ubicación que acompaña a toda firma como evidencia. */
export interface BiometricGeolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Cada cuánto se vuelve a preguntar mientras la prueba biométrica está en curso.
 *
 * El veredicto de Didit no llega al navegador: llega al backend por webhook. Sin este sondeo, el
 * firmante terminaría la prueba en el celular y se quedaría mirando el QR hasta recargar. Mismo
 * intervalo que la verificación de identidad.
 */
export const BIOMETRIC_POLL_INTERVAL_MS = 5_000;

/** Estados en los que la sesión de Didit todavía puede cambiar sola. */
const IN_FLIGHT_STATUSES: readonly BiometricSignatureStatus[] = [
  BiometricSignatureStatus.Pending,
  BiometricSignatureStatus.InProgress,
];

/**
 * Cada cuánto sondear según el último estado conocido, o `false` para no sondear.
 *
 * Se sondea mientras la sesión puede cambiar sola (pendiente o en captura) y también con la
 * biometría ya aprobada pero la firma todavía sin registrar: el backend firma al recibir el webhook
 * y hay que enterarse de cuándo terminó. En un desenlace —firmado, rechazado, vencido— seguir
 * preguntando sería tráfico inútil.
 *
 * @param session - Último estado conocido; `null`/`undefined` si no hay intento.
 * @returns El intervalo en milisegundos, o `false`.
 *
 * @example
 * ```ts
 * biometricPollInterval({ status: 'IN_PROGRESS', signatureCompleted: false, … }); // 5000
 * ```
 */
export function biometricPollInterval(
  session: BiometricSignatureSession | null | undefined,
): number | false {
  if (!session || session.signatureCompleted) return false;

  if (
    IN_FLIGHT_STATUSES.includes(session.status) ||
    session.status === BiometricSignatureStatus.Approved
  ) {
    return BIOMETRIC_POLL_INTERVAL_MS;
  }

  return false;
}
