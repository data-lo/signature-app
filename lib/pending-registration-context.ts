export interface PendingRegistrationContext {
  email: string;
  maskedEmail: string;
  /** false cuando la CURP ya tenía un pre-registro pendiente (Caso A) — la pantalla de OTP lo usa para mostrar el aviso de la historia. */
  isNewPreRegistration: boolean;
}

const STORAGE_KEY = 'pending_registration_context';

/**
 * Contexto del pre-registro pendiente de verificación (ver historia "Auth: Flujo de
 * Pre-registro, Verificación OTP y Control por CURP"), guardado en localStorage en vez de
 * arrastrarse por query params hacia /signup/verify — mismo criterio que
 * pending-signature-context.ts. Debe limpiarse una vez consumido (ver
 * clearPendingRegistrationContext).
 */
export function setPendingRegistrationContext(
  context: PendingRegistrationContext,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // localStorage no disponible (modo privado, cuota excedida, etc.) — el registro ya se
    // completó en el backend; el usuario solo pierde la redirección automática a /signup/verify.
  }
}

export function getPendingRegistrationContext(): PendingRegistrationContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingRegistrationContext>;
    if (
      typeof parsed.email !== 'string' ||
      typeof parsed.maskedEmail !== 'string' ||
      typeof parsed.isNewPreRegistration !== 'boolean'
    ) {
      return null;
    }
    return parsed as PendingRegistrationContext;
  } catch {
    return null;
  }
}

export function clearPendingRegistrationContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
