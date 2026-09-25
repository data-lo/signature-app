'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  getDocumentApproversRequest,
  type DocumentApprover,
} from '../_requests';

/** Un aprobador listo para alimentar el `FormSelect`. */
export interface ApproverOption {
  /**
   * `userId` y no `accountId`: lo que el contrato pide es `reviewerUserId`, el usuario que
   * aprobará. La membresía es el vehículo por el que se sabe que puede hacerlo, no lo que se
   * envía.
   */
  value: string;
  /**
   * "Nombre Apellido (correo)": el nombre es como lo reconoce quien elige, y el correo desempata a
   * dos personas que se llamen igual. Sin nombre registrado, sólo el correo.
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
 * Traduce los aprobadores a opciones del selector.
 *
 * Ya no filtra: el backend devuelve sólo a los miembros activos cuyo rol concede
 * `DOCUMENT.APPROVE`, que es lo que antes se filtraba aquí sobre el listado completo de miembros.
 *
 * @param approvers - Aprobadores tal como los devuelve el backend.
 * @returns Las opciones, en el mismo orden.
 * @throws Nada: es una función pura.
 *
 * @example
 * ```ts
 * toApproverOptions(approvers); // [{ value: 'user-1', label: 'Ana Ruiz (ana@empresa.com)' }]
 * ```
 */
export function toApproverOptions(
  approvers: DocumentApprover[],
): ApproverOption[] {
  return approvers.map((approver) => {
    const name = `${approver.firstName} ${approver.lastName}`.trim();
    return {
      value: approver.userId,
      label: name ? `${name} (${approver.email})` : approver.email,
    };
  });
}

/**
 * Un error de permisos o de la petición no cambia por reintentar: se muestra al primer intento en
 * vez de dejar varios segundos el "Cargando" mientras React Query insiste. Sólo los fallos del
 * servidor o de la red se reintentan.
 */
function retryUnlessClientError(failureCount: number, error: unknown) {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status < 500) return false;
  return failureCount < 2;
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
 * Vive en los `_hooks` de esta ruta y no en `lib/hooks` porque "aprobadores" no es un catálogo
 * de la organización sino la lectura que hace ESTA pantalla del listado de miembros.
 *
 * @param enabled - Si la opción "Requiere aprobación" está activa.
 * @returns La consulta, con `data` ya reducida a opciones del selector.
 *
 * @throws Nada por sí mismo: el fallo llega como `query.isError` (un 403 si el rol del usuario no
 * tiene `DOCUMENT.CREATE`).
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
    queryFn: getDocumentApproversRequest,
    // Una cuenta PERSONAL no tiene `organizationId` — y tampoco llega aquí, porque sin
    // organización la opción "Requiere aprobación" ni siquiera se muestra.
    enabled: enabled && !!organizationId,
    select: toApproverOptions,
    retry: retryUnlessClientError,
  });
}
