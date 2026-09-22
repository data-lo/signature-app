'use server';

import { revalidatePath } from 'next/cache';

import {
  clearActiveAccountCookie,
  setActiveAccountCookie,
} from '@/lib/authorization/active-account-cookie.server';
import type { AuthorizationContext } from '@/lib/authorization/authorization.types';
import {
  backendRequest,
  BackendRequestError,
} from '@/lib/server/backend-request';

/**
 * Resultado del cambio de cuenta.
 *
 * El contexto viaja de vuelta porque esta acción ya tuvo que pedirlo para comprobar la
 * pertenencia: devolverlo evita que quien llama haga una segunda consulta para saber con qué rol
 * y con qué permisos quedó la cuenta a la que acaba de cambiar. Quien no lo necesite lo ignora.
 */
export type SwitchAccountResult =
  { ok: true; context: AuthorizationContext } | { ok: false; message: string };

/**
 * Cambia la cuenta activa del usuario.
 *
 * Es el ÚNICO camino para escribir la cookie: es `HttpOnly`, así que ningún código del navegador
 * puede tocarla, y quien quiera cambiar de cuenta tiene que pasar por aquí.
 *
 * **La pertenencia se comprueba contra el backend, no contra nada que mande el cliente.** Se pide
 * el contexto de autorización de la cuenta candidata: si el usuario no es miembro activo de ella,
 * el backend responde 403 y la cookie no se escribe. Que el identificador venga del navegador no
 * abre ningún hueco — el backend lo valida igual que validaría cualquier otro.
 *
 * `revalidatePath('/dashboard', 'layout')` es lo que hace que el cambio se note: el layout se
 * vuelve a renderizar en el servidor, lee la cookie nueva y baja los permisos de la cuenta
 * nueva. Sin eso la cookie cambiaría y la pantalla seguiría enseñando lo de antes.
 *
 * @param accountId - Membresía que pasa a ser la activa.
 * @returns El contexto de autorización de la cuenta nueva, o el motivo por el que no se pudo
 *   cambiar.
 * @throws Nada: los fallos vuelven como resultado para poder mostrarlos.
 *
 * @example
 * ```ts
 * const result = await switchActiveAccountAction(account.id);
 * if (!result.ok) toast.error(result.message);
 * ```
 */
export async function switchActiveAccountAction(
  accountId: string,
): Promise<SwitchAccountResult> {
  let context: AuthorizationContext;

  try {
    context = await backendRequest<AuthorizationContext>(
      'authorization/context',
      { activeAccountId: accountId },
    );
  } catch (error) {
    console.error(
      '[switch-active-account] no se pudo cambiar de cuenta:',
      error,
    );

    if (error instanceof BackendRequestError && error.status === 403) {
      /**
       * La cuenta elegida no es suya o ya no lo es. Se limpia la cookie en vez de dejar la
       * anterior: si el usuario llegó a pedirla es porque su catálogo estaba desactualizado, y la
       * siguiente carga resolverá una cuenta válida desde cero.
       */
      await clearActiveAccountCookie();
      revalidatePath('/dashboard', 'layout');

      return {
        ok: false,
        message: 'Ya no tienes acceso a esa cuenta. Elige otra para continuar.',
      };
    }

    return {
      ok: false,
      message: 'No se pudo cambiar de cuenta. Intenta de nuevo.',
    };
  }

  await setActiveAccountCookie(accountId);
  revalidatePath('/dashboard', 'layout');

  return { ok: true, context };
}
