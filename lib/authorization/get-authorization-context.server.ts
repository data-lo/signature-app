import { backendRequest, BackendRequestError } from '@/lib/server/backend-request';
import type { AccountData } from '@/lib/api/accounts';

import type { AuthorizationContext } from './authorization.types';
import { getActiveAccountIdFromCookie } from './active-account-cookie.server';

/**
 * Por qué no se pudo resolver el contexto.
 *
 * Se distingue en tres casos porque cada uno se atiende distinto y confundirlos produce
 * exactamente los errores que la historia pide evitar: mandar a iniciar sesión a quien la tiene,
 * o dejar clavada una cuenta a la que ya no se pertenece.
 */
export type AuthorizationContextFailure =
  /** 401: la sesión caducó o no llegó. Toca volver a entrar. */
  | 'UNAUTHENTICATED'
  /** 403/400: hay sesión, pero la cuenta activa ya no es suya. Toca elegir otra. */
  | 'ACCOUNT_UNAVAILABLE'
  /** El backend no contestó. Es recuperable: se reintenta, no se cierra la sesión. */
  | 'UNREACHABLE';

export type AuthorizationContextResult =
  | { ok: true; context: AuthorizationContext; resolvedFromCookie: boolean }
  | { ok: false; failure: AuthorizationContextFailure };

/**
 * El contexto de autorización de la cuenta activa, resuelto durante el render del servidor.
 *
 * Cuando la cookie todavía no existe —primera visita, o alguien que venía usando la versión
 * anterior, donde la cuenta activa se guardaba en `localStorage`— se resuelve una cuenta por
 * defecto consultando el catálogo del usuario y prefiriendo la PERSONAL, que es la regla que ya
 * aplicaba el cliente. **No se escribe la cookie aquí**: Next no permite escribir cookies durante
 * el render de un Server Component, así que se devuelve `resolvedFromCookie: false` y es el
 * cliente quien la confirma con la Server Action. El usuario no nota nada: lo que se pinta ya es
 * el contexto correcto.
 *
 * Devuelve un resultado en vez de lanzar porque las tres formas de fallar llevan a pantallas
 * distintas, y un `throw` las igualaría todas en el error boundary.
 *
 * @returns El contexto y si venía de la cookie, o el motivo del fallo.
 *
 * @example
 * ```ts
 * const result = await getAuthorizationContext();
 * if (!result.ok) redirect('/login');
 * result.context.permissions; // ['DOCUMENT.READ_OWN', …]
 * ```
 */
export async function getAuthorizationContext(): Promise<AuthorizationContextResult> {
  const cookieAccountId = await getActiveAccountIdFromCookie();

  if (cookieAccountId) {
    const result = await requestContext(cookieAccountId);

    /**
     * Una cuenta de la cookie que el backend ya no acepta no se da por perdida: se vuelve a
     * intentar con la cuenta por defecto. Es el caso de a quien le revocaron el acceso a una
     * organización mientras la tenía activa — sin este segundo intento se quedaría fuera del
     * dashboard entero teniendo su cuenta personal intacta.
     */
    if (result.ok || result.failure !== 'ACCOUNT_UNAVAILABLE') {
      return result.ok ? { ...result, resolvedFromCookie: true } : result;
    }
  }

  const fallbackAccountId = await resolveDefaultAccountId();

  if (!fallbackAccountId.ok) {
    return fallbackAccountId;
  }

  const result = await requestContext(fallbackAccountId.accountId);
  return result.ok ? { ...result, resolvedFromCookie: false } : result;
}

/**
 * Pide el contexto de una cuenta concreta y traduce el fallo del backend a un motivo.
 *
 * @param accountId - Cuenta activa que se declara.
 * @returns El contexto, o el motivo del fallo.
 *
 * @example
 * ```ts
 * const result = await requestContext('account-1');
 * ```
 */
async function requestContext(
  accountId: string,
): Promise<
  | { ok: true; context: AuthorizationContext }
  | { ok: false; failure: AuthorizationContextFailure }
> {
  try {
    const context = await backendRequest<AuthorizationContext>(
      'authorization/context',
      { activeAccountId: accountId },
    );

    return { ok: true, context };
  } catch (error) {
    return { ok: false, failure: classifyFailure(error) };
  }
}

/**
 * Cuenta con la que arrancar cuando la cookie no dice nada.
 *
 * Prefiere la PERSONAL —que todo usuario tiene desde que se registra— y cae a la primera activa
 * del catálogo si no la encontrara. Es la misma regla que aplicaba el cliente al rehidratar el
 * store, movida al servidor para que el primer HTML ya salga con los permisos correctos.
 *
 * @returns El identificador de la cuenta por defecto, o el motivo del fallo.
 *
 * @example
 * ```ts
 * const fallback = await resolveDefaultAccountId();
 * ```
 */
async function resolveDefaultAccountId(): Promise<
  | { ok: true; accountId: string }
  | { ok: false; failure: AuthorizationContextFailure }
> {
  let accounts: AccountData[];

  try {
    accounts = await backendRequest<AccountData[]>('accounts/me');
  } catch (error) {
    return { ok: false, failure: classifyFailure(error) };
  }

  const active = accounts.filter((account) => account.isActive);
  const personal = active.find((account) => account.type === 'PERSONAL');
  const chosen = personal ?? active[0];

  if (!chosen) {
    return { ok: false, failure: 'ACCOUNT_UNAVAILABLE' };
  }

  return { ok: true, accountId: chosen.id };
}

/**
 * Traduce el fallo de `backendRequest` al motivo que la pantalla sabe atender.
 *
 * El 400 se agrupa con el 403 a propósito: el backend responde 400 cuando la petición no declara
 * cuenta activa, y desde la pantalla eso es lo mismo que no tener una cuenta usable —hay que
 * elegir otra—, no un error de programación que el usuario pueda hacer algo por arreglar.
 *
 * @param error - Lo que lanzó `backendRequest`.
 * @returns El motivo del fallo.
 *
 * @example
 * ```ts
 * classifyFailure(new BackendRequestError(403, 'No tienes acceso')); // 'ACCOUNT_UNAVAILABLE'
 * ```
 */
function classifyFailure(error: unknown): AuthorizationContextFailure {
  if (!(error instanceof BackendRequestError)) return 'UNREACHABLE';

  if (error.status === 401) return 'UNAUTHENTICATED';
  if (error.status === 403 || error.status === 400) return 'ACCOUNT_UNAVAILABLE';

  return 'UNREACHABLE';
}
