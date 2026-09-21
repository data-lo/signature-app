import type {
  AuthorizationContext,
  PermissionKey,
} from './authorization.types';
import { SYSTEM_ROLE_NAME } from './authorization.types';
import { hasAllPermissions } from './permissions';

/**
 * Permisos sin los que no tiene sentido mandar a nadie a Planes.
 *
 * Son los dos y no sólo `BILLING.READ`: la pantalla de Planes exige leer para abrirse, pero a
 * quien acaba de crear una organización se le manda ahí a CONTRATAR, y sin `BILLING.MANAGE` el
 * checkout responde 403. Llegaría a un catálogo que puede mirar y no puede usar, que es
 * exactamente el callejón sin salida que esta historia viene a quitar.
 */
export const BILLING_PERMISSIONS_REQUIRED_TO_CONTRACT: readonly PermissionKey[] =
  ['BILLING.READ', 'BILLING.MANAGE'] as const;

/** Por qué la organización recién creada no se puede activar. */
export type OrganizationActivationProblem =
  /** El servidor quedó en otra cuenta: la cookie no se escribió con la que se acaba de crear. */
  | 'ACCOUNT_MISMATCH'
  /** La cuenta activa no es una organización. */
  | 'NOT_AN_ORGANIZATION'
  /** Quien la creó no quedó como su propietario. */
  | 'NOT_OWNER'
  /** El rol no concede lo que hace falta para contratar un plan. */
  | 'MISSING_BILLING_PERMISSIONS';

export type OrganizationActivationCheck =
  | { ok: true }
  | { ok: false; problem: OrganizationActivationProblem; message: string };

/** Lo que se le dice al usuario en cada caso, sin jerga de permisos ni de cookies. */
const PROBLEM_MESSAGES: Record<OrganizationActivationProblem, string> = {
  ACCOUNT_MISMATCH:
    'La organización se creó, pero no se pudo activar. Elígela en el selector de cuentas para continuar.',
  NOT_AN_ORGANIZATION:
    'La organización se creó, pero no se pudo activar. Elígela en el selector de cuentas para continuar.',
  NOT_OWNER:
    'La organización se creó, pero no quedaste como su propietario. Contacta a soporte para revisarlo.',
  MISSING_BILLING_PERMISSIONS:
    'La organización se creó, pero tu rol no permite contratar su plan. Contacta a soporte para revisarlo.',
};

/**
 * Comprueba que la cuenta activa del SERVIDOR es la organización recién creada y que su creador
 * quedó dentro con lo necesario para contratarle un plan.
 *
 * Se corre sobre el contexto que devuelve `switchActiveAccountAction`, es decir sobre lo que el
 * backend resolvió al escribir la cookie, y no sobre lo que el formulario creyó crear. Esa
 * distinción es el motivo de existir de esta función: el error que la historia viene a corregir
 * era exactamente el de dar por buena la cuenta que el cliente tenía en memoria.
 *
 * **Que la membresía sea del usuario y esté activa no se comprueba aquí, y no es un olvido.** El
 * backend sólo devuelve contexto de una membresía propia y vigente —cualquier otra cosa es un
 * 403 que la Server Action ya convirtió en fallo—, así que repetirlo en el cliente sería una
 * comprobación que no puede fallar y que aparentaría una garantía que no da. Lo que sí se mira
 * aquí es lo que el 403 no cubre: que sea LA organización esperada, que sea una organización, y
 * con qué rol y permisos quedó.
 *
 * @param expectedAccountId - Membresía que devolvió el alta de la organización.
 * @param context - Contexto de autorización resuelto por el servidor para la cuenta activa.
 * @returns `{ ok: true }`, o el problema y el mensaje que se le muestra al usuario.
 *
 * @example
 * ```ts
 * const check = verifyOrganizationOwnerActivation(account.id, result.context);
 * if (!check.ok) toast.error(check.message);
 * ```
 */
export function verifyOrganizationOwnerActivation(
  expectedAccountId: string,
  context: AuthorizationContext,
): OrganizationActivationCheck {
  const problem = findProblem(expectedAccountId, context);

  return problem
    ? { ok: false, problem, message: PROBLEM_MESSAGES[problem] }
    : { ok: true };
}

/**
 * El primer problema que impide activar la organización, o `undefined` si no hay ninguno.
 *
 * El orden va de lo más general a lo más fino —cuenta, tipo, rol, permisos— para que el mensaje
 * describa la causa raíz: a quien cambió de cuenta la equivocada no le sirve enterarse de que le
 * faltan permisos de facturación.
 *
 * @param expectedAccountId - Membresía que devolvió el alta.
 * @param context - Contexto resuelto por el servidor.
 * @returns El problema encontrado, o `undefined`.
 *
 * @example
 * ```ts
 * findProblem('org-1', context); // 'NOT_OWNER'
 * ```
 */
function findProblem(
  expectedAccountId: string,
  context: AuthorizationContext,
): OrganizationActivationProblem | undefined {
  if (context.accountId !== expectedAccountId) return 'ACCOUNT_MISMATCH';
  if (context.accountType !== 'ORGANIZATION') return 'NOT_AN_ORGANIZATION';
  if (context.roleName !== SYSTEM_ROLE_NAME.OWNER) return 'NOT_OWNER';

  if (
    !hasAllPermissions(
      context.permissions,
      BILLING_PERMISSIONS_REQUIRED_TO_CONTRACT,
    )
  ) {
    return 'MISSING_BILLING_PERMISSIONS';
  }

  return undefined;
}
