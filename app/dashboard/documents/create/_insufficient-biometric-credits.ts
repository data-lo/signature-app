import { AxiosError } from 'axios';

/** Código estable con el que el backend responde el 402 por falta de créditos biométricos. */
export const INSUFFICIENT_BIOMETRIC_CREDITS_CODE =
  'INSUFFICIENT_BIOMETRIC_CREDITS';

/** Título del aviso, el mismo texto que el `message` del backend. */
export const INSUFFICIENT_BIOMETRIC_CREDITS_TITLE =
  'Saldo insuficiente para firmas biométricas.';

/** Qué se puede hacer para enviar el documento. */
export const INSUFFICIENT_BIOMETRIC_CREDITS_HINT =
  'Quita firmantes biométricos, cambia el tipo de firma o compra más créditos. Tu documento y su configuración se conservan.';

/** Números del 402 biométrico; `null` si el backend no los mandó. */
export interface InsufficientBiometricCredits {
  required: number | null;
  available: number | null;
}

interface InsufficientBiometricCreditsBody {
  code?: unknown;
  details?: { required?: unknown; available?: unknown };
  error?: {
    code?: unknown;
    details?: { required?: unknown; available?: unknown };
  };
}

/**
 * Reconoce el 402 `INSUFFICIENT_BIOMETRIC_CREDITS` del alta de un documento y extrae cuántos
 * créditos hacían falta y cuántos hay.
 *
 * Decide por el código, nunca por el texto. Lee `error.code`/`error.details` (contrato del
 * dashboard) y, si faltan, `code`/`details` en la raíz.
 *
 * @param error - Error de la mutación (normalmente un `AxiosError`).
 * @returns Los créditos requeridos y disponibles, o `null` si el error es otro.
 *
 * @example
 * ```ts
 * getInsufficientBiometricCredits(error); // { required: 3, available: 2 }
 * ```
 */
export function getInsufficientBiometricCredits(
  error: unknown,
): InsufficientBiometricCredits | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 402) {
    return null;
  }

  const body = error.response.data as
    InsufficientBiometricCreditsBody | undefined;
  const code = body?.error?.code ?? body?.code;
  if (code !== INSUFFICIENT_BIOMETRIC_CREDITS_CODE) {
    return null;
  }

  const details = body?.error?.details ?? body?.details;
  return {
    required: toCount(details?.required),
    available: toCount(details?.available),
  };
}

/**
 * Frase con lo que falta, con el plural correcto.
 *
 * @param credits - Créditos requeridos y disponibles.
 * @returns La frase; una genérica si el backend no mandó los números.
 *
 * @example
 * ```ts
 * insufficientBiometricCreditsMessage({ required: 3, available: 2 });
 * // 'Necesitas 3 créditos y tienes 2 disponibles.'
 * insufficientBiometricCreditsMessage({ required: 1, available: 0 });
 * // 'Necesitas 1 crédito y tienes 0 disponibles.'
 * ```
 */
export function insufficientBiometricCreditsMessage({
  required,
  available,
}: InsufficientBiometricCredits): string {
  if (required === null || available === null) {
    return 'No tienes créditos biométricos suficientes para todos los firmantes biométricos.';
  }

  const requiredLabel = required === 1 ? '1 crédito' : `${required} créditos`;
  const availableLabel =
    available === 1 ? '1 disponible' : `${available} disponibles`;
  return `Necesitas ${requiredLabel} y tienes ${availableLabel}.`;
}

/**
 * Normaliza un conteo que llega del backend.
 *
 * @param value - Valor recibido.
 * @returns El entero no negativo, o `null` si no lo es.
 *
 * @example
 * ```ts
 * toCount(2); // 2
 * toCount('2'); // null
 * ```
 */
function toCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
