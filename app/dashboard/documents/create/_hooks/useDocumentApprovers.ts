'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getOrganizationMembersRequest,
  type OrganizationMember,
} from '@/lib/api/organization-members';
import type { PermissionKey } from '@/lib/authorization/authorization.types';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Capacidad del catálogo estático que distingue a un aprobador: no es un rol ni un puesto, así
 * que la lista no se arma por nombre de rol ("Aprobador") sino por el permiso que ese rol otorgue.
 * Una organización que lo reparte desde un rol propio aparece igual.
 *
 * Es el mismo permiso que el backend vuelve a exigir al crear el documento (ver
 * `DocumentReviewerService`): esta lista es una comodidad para elegir, no la autorización.
 */
const APPROVE_DOCUMENT_PERMISSION: PermissionKey = 'DOCUMENT.APPROVE';

/** Un aprobador listo para alimentar el `FormSelect`. */
export interface ApproverOption {
  /**
   * `userId` y no `accountId`: lo que el contrato pide es `reviewerUserId`, el usuario que
   * aprobará. La membresía es el vehículo por el que se sabe que puede hacerlo, no lo que se
   * envía.
   */
  value: string;
  /**
   * El correo del miembro, que es la única identidad que publica hoy
   * `GET /organizations/:id/members` (ver `OrganizationMemberData` en el backend: trae email, RFC
   * y rol, pero no nombre). En cuanto ese endpoint publique nombre y apellido, esto pasa a ser
   * "Nombre Apellido" y no cambia nada más.
   */
  label: string;
}

/**
 * Llave de la consulta, con la organización dentro: quien pertenece a dos organizaciones no debe
 * ver los aprobadores de una mientras crea un documento en la otra.
 *
 * @param organizationId - Organización activa, o `null` si todavía no hay ninguna.
 * @returns La llave para `useQuery`/`invalidateQueries`.
 * @throws Nada: es una función pura sobre una cadena.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: documentApproversQueryKey('org-1') });
 * ```
 */
export function documentApproversQueryKey(organizationId: string | null) {
  return ['documentApprovers', organizationId] as const;
}

/**
 * Traduce los miembros de la organización a la lista de aprobadores elegibles.
 *
 * Deja fuera a quien no ha entrado todavía (`pending_invite`) o ya no está (`suspended`,
 * `removed`): el permiso lo tendrán por su rol, pero un miembro que no puede iniciar sesión no
 * puede aprobar nada, y ofrecerlo dejaría el documento esperando a alguien que nunca lo verá.
 *
 * @param members - Miembros tal como los devuelve el backend.
 * @returns Los aprobadores, en el orden en que llegan (por antigüedad en la organización).
 * @throws Nada: es una función pura.
 *
 * @example
 * ```ts
 * toApproverOptions(members); // [{ value: 'user-1', label: 'ana@empresa.com' }]
 * ```
 */
export function toApproverOptions(
  members: OrganizationMember[],
): ApproverOption[] {
  return members
    .filter(
      (member) =>
        member.isActive &&
        member.status === 'active' &&
        member.permissions.some(
          (permission) => permission.key === APPROVE_DOCUMENT_PERMISSION,
        ),
    )
    .map((member) => ({ value: member.userId, label: member.email }));
}

/**
 * Usuarios de la organización activa que pueden aprobar documentos, para el selector que aparece
 * al marcar "Requiere aprobación" (ver `ApproverUserField`).
 *
 * `enabled` es la regla de la historia: mientras la opción esté desmarcada no se consulta nada —ni
 * una petición de más por abrir la pantalla— y la lista sólo se pide cuando el usuario declara que
 * el documento necesita aprobación. Al desmarcarla, React Query conserva lo traído en caché, así
 * que volver a marcarla no dispara una segunda petición.
 *
 * @param enabled - Si la opción "Requiere aprobación" está activa.
 * @returns La consulta, con `data` ya reducida a opciones del selector.
 *
 * @throws Nada por sí mismo: el fallo llega como `query.isError` (un 403 cuando el usuario no
 * tiene `MEMBER.READ` en su organización).
 *
 * @example
 * ```tsx
 * const approversQuery = useDocumentApprovers(requiresApproval);
 * approversQuery.data?.length === 0; // "No hay usuarios aprobadores disponibles"
 * ```
 */
export function useDocumentApprovers(enabled: boolean) {
  const organizationId =
    useAuthStore((state) => state.activeAccount?.organizationId) ?? null;

  return useQuery({
    queryKey: documentApproversQueryKey(organizationId),
    queryFn: () => getOrganizationMembersRequest(organizationId as string),
    // Una cuenta PERSONAL no tiene `organizationId` — y tampoco llega aquí, porque sin
    // organización la opción "Requiere aprobación" ni siquiera se muestra.
    enabled: enabled && !!organizationId,
    select: toApproverOptions,
  });
}
