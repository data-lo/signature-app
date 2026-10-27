import axios from 'axios';
import type { SigningSessionResponse } from '@/app/(public)/_signing/signing-session';

/**
 * Cliente HTTP de la invitación por token: aparte de `lib/axios` por lo mismo que los de invitado
 * (no manda la sesión de nadie ni redirige a `/login` ante un error).
 */
const invitationClient = axios.create({ baseURL: '/api' });

/**
 * Resuelve la sesión de firma de un token de invitación. El token va en la ruta tal cual: no se
 * registra en ningún log (ver `lib/observability/sensitive-data.ts`).
 *
 * @param token - Token de `/sign/:token`.
 * @returns La sesión: completa si está `ACTIVE`, sólo el estado si no.
 *
 * @throws {AxiosError} 404 si el token no existe, 429 si se consultó demasiadas veces.
 *
 * @example
 * ```ts
 * const session = await getSigningSessionByTokenRequest('q3Vb…');
 * ```
 */
export async function getSigningSessionByTokenRequest(
  token: string,
): Promise<SigningSessionResponse> {
  const { data } = await invitationClient.get<SigningSessionResponse>(
    `/api/v1/public/signing-sessions/${encodeURIComponent(token)}`,
  );
  return data;
}
