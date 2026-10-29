import type {
  SigningError,
  SigningResult,
  SigningSession,
} from '../signing-session';

/** Contrato común de los flujos de firma que resuelve `SignatureFlowResolver`. */
export interface SignatureFlowProps {
  session: SigningSession;
  onSuccess: (result: SigningResult) => void;
  onError: (error: SigningError) => void;
}

/**
 * Invitación que esperan los flujos de invitado existentes: el colaborador y, si el enlace viejo lo
 * traía, el correo. `null` sólo al retomar la biometría de regreso de Didit.
 *
 * @param session - Sesión activa.
 * @returns La invitación, o `null` sin colaborador.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * guestInvitationOf(session); // { collaboratorId: 'c-1' }
 * ```
 */
export function guestInvitationOf(
  session: SigningSession,
): { collaboratorId: string; email?: string } | null {
  const { collaboratorId, email } = session.signer;
  if (!collaboratorId) return null;
  return { collaboratorId, ...(email ? { email } : {}) };
}
