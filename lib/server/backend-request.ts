import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '@/lib/cookies';

/**
 * Base del backend tal como la alcanza el servidor de Next.
 *
 * No pasa por el rewrite de `next.config.ts`: aquél traduce `/api/*` para el NAVEGADOR, y desde
 * el servidor no hay ningún proxy de por medio. La variable no lleva el prefijo `NEXT_PUBLIC_`, y
 * por eso no queda incrustada en el bundle del cliente durante `next build`.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'http://backend:3000';

/**
 * Prefijo global del backend, el que aplica `applyGlobalApiPrefix` en signature-server. Se
 * declara aquí —y no en cada Server Action— porque es una propiedad del servidor, no de cada
 * endpoint.
 */
const API_PREFIX = 'api/v1';

/**
 * Fallo de una llamada al backend hecha desde el servidor.
 *
 * Lleva el código HTTP porque es lo que permite a la sección decidir sin adivinar: 401 es "vuelve
 * a entrar", 403 es "no te toca", y cualquier otro es un fallo real que debe subir al error
 * boundary. El mensaje del backend se conserva para el log del servidor; nunca se pinta en la
 * pantalla del usuario.
 */
export class BackendRequestError extends Error {
  readonly status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.name = 'BackendRequestError';
    this.status = status;
  }
}

interface BackendRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Cuerpo JSON. Se serializa aquí para que ningún llamador tenga que fijar el Content-Type. */
  body?: unknown;
  /**
   * Header `X-Account-Id`: la membresía del llamador en la organización activa. Sólo lo exigen
   * las dos altas (invitar y agregar), que resuelven la organización a partir de él. El resto de
   * endpoints la toman del path y validan contra el `sub` del JWT.
   */
  accountId?: string;
  searchParams?: Record<string, string | undefined>;
}

/**
 * Llama al backend desde el servidor con la sesión del usuario actual.
 *
 * La sesión sale de la cookie `token`, que es lo único de la sesión que el servidor puede leer:
 * `activeAccount` vive en `localStorage` y por eso la organización viaja siempre en la URL o como
 * argumento explícito, nunca inferida aquí.
 *
 * Ni el token ni la URL interna aparecen en el error que se propaga: sólo el código HTTP y el
 * mensaje del backend, que es lo que sirve en el log del servidor.
 *
 * @param path - Ruta bajo el prefijo global, sin barra inicial (p. ej. `organizations/x/members`).
 * @param options - Método, cuerpo, `X-Account-Id` y parámetros de consulta.
 * @returns El campo `data` de la respuesta del backend, ya deserializado.
 * @throws {BackendRequestError} Si no hay sesión, si el backend responde fuera del rango 2xx o si
 * la respuesta no se puede interpretar.
 *
 * @example
 * ```ts
 * const members = await backendRequest<OrganizationMember[]>(
 *   `organizations/${organizationId}/members`,
 *   { searchParams: { includeInactive: 'true' } },
 * );
 * ```
 */
export async function backendRequest<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    throw new BackendRequestError(401, 'No hay sesión en la petición');
  }

  const url = new URL(`${BACKEND_API_URL}/${API_PREFIX}/${path}`);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.accountId) {
    headers['X-Account-Id'] = options.accountId;
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Los miembros cambian por acciones de otros administradores: una respuesta cacheada
      // mostraría un equipo que ya no es el que hay.
      cache: 'no-store',
    });
  } catch (error) {
    // No se llegó al servidor (backend apagado, DNS, red). El detalle no le sirve al usuario.
    throw new BackendRequestError(
      null,
      error instanceof Error ? error.message : 'No se pudo alcanzar el backend',
    );
  }

  if (!response.ok) {
    throw new BackendRequestError(
      response.status,
      await readBackendErrorMessage(response),
    );
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

/**
 * Mensaje de error del backend, para el log del servidor.
 *
 * Se lee con tolerancia a propósito: un 502 de un proxy delante del backend devuelve HTML, no el
 * `{ success, message }` de la API, y dejar que `response.json()` reviente convertiría un fallo
 * ya diagnosticado en un `SyntaxError` sin relación con la causa.
 *
 * @param response - Respuesta fuera del rango 2xx.
 * @returns El `message` del backend, o el texto de estado cuando la respuesta no es JSON.
 *
 * @example
 * ```ts
 * const message = await readBackendErrorMessage(response); // 'No eres miembro de esta organización'
 * ```
 */
async function readBackendErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
