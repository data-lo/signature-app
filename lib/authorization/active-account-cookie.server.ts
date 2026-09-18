import { cookies } from 'next/headers';

/**
 * Cookie donde vive la cuenta activa.
 *
 * Es `HttpOnly`, y por eso el nombre no se exporta hacia ningún módulo del cliente: nada en el
 * navegador puede leerla ni escribirla, y el único camino para cambiarla es la Server Action de
 * cambio de cuenta, que antes comprueba la membresía contra el backend.
 *
 * El sufijo `.server` del archivo es una convención de lectura, no una barrera; la barrera real
 * la pone `next/headers`, que revienta en cuanto alguien lo importa desde un componente cliente.
 *
 * Antes este dato vivía en `localStorage`, dentro del store de sesión. Se movió porque el
 * servidor no podía leerlo: sin él, el layout no sabía de qué cuenta pedir los permisos, y toda
 * la autorización de la interfaz tenía que resolverse después de hidratar, ya en el cliente —con
 * el menú completo pintado durante un instante.
 */
const ACTIVE_ACCOUNT_COOKIE_NAME = 'active-account-id';

/**
 * Duración de la cookie: un año.
 *
 * No es una sesión, es una preferencia —"en qué cuenta estaba trabajando"— y sobrevivir al cierre
 * del navegador es justo lo que se espera de ella. No otorga acceso a nada: el acceso lo da el
 * JWT, y la pertenencia a la cuenta se revalida en cada petición.
 */
const ACTIVE_ACCOUNT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * La cuenta activa de esta petición, si el navegador la trae.
 *
 * @returns El identificador de la membresía activa, o `undefined` en la primera visita (o tras
 *   limpiar las cookies).
 *
 * @example
 * ```ts
 * const activeAccountId = await getActiveAccountIdFromCookie();
 * ```
 */
export async function getActiveAccountIdFromCookie(): Promise<
  string | undefined
> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ACCOUNT_COOKIE_NAME)?.value;
}

/**
 * Fija la cuenta activa.
 *
 * Sólo puede llamarse desde una Server Action o un Route Handler: Next no permite escribir
 * cookies durante el render de un Server Component, y por eso el layout resuelve una cuenta por
 * defecto sin persistirla y deja que el cliente la confirme.
 *
 * `sameSite: 'lax'` y no `'strict'`: con `strict`, volver al dashboard desde el enlace de un
 * correo —o desde el retorno de Stripe— llegaría sin la cookie y el usuario aterrizaría en otra
 * cuenta.
 *
 * @param accountId - Membresía que pasa a ser la activa. Quien llama ya comprobó que es del
 *   usuario autenticado.
 * @returns Nada.
 *
 * @example
 * ```ts
 * await setActiveAccountCookie('account-1');
 * ```
 */
export async function setActiveAccountCookie(accountId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_ACCOUNT_COOKIE_NAME, accountId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACTIVE_ACCOUNT_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Borra la cuenta activa.
 *
 * Se usa cuando la membresía deja de valer —acceso revocado, organización eliminada—: conservar
 * el identificador sólo conseguiría que la siguiente visita volviera a fallar con el mismo 403.
 *
 * @returns Nada.
 *
 * @example
 * ```ts
 * await clearActiveAccountCookie();
 * ```
 */
export async function clearActiveAccountCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ACCOUNT_COOKIE_NAME);
}
