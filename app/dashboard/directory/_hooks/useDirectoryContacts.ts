'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listDirectoryContactsRequest } from '../_requests';

/** Contactos por página; coincide con el `limit` por omisión del backend. */
export const DIRECTORY_CONTACTS_PAGE_SIZE = 25;

/**
 * Llave raíz de los contactos del Directorio de una cuenta. Las mutaciones invalidan esta llave
 * para refrescar todas las páginas de esa cuenta a la vez.
 *
 * Lleva la cuenta porque el directorio depende de ella (personal u organización): sin ella, al
 * cambiar de cuenta se pintaría por un instante el directorio de la anterior desde la caché.
 *
 * @param accountId - Cuenta activa; `null` mientras se resuelve.
 * @returns La llave de React Query.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: directoryContactsQueryKey('acc-1') });
 * ```
 */
export function directoryContactsQueryKey(accountId: string | null) {
  return ['directoryContacts', accountId] as const;
}

/**
 * Una página de contactos del Directorio de la cuenta activa (`GET /directory/contacts`).
 *
 * Conserva la página anterior mientras llega la siguiente (`keepPreviousData`), para que paginar
 * no vacíe la tabla en cada clic.
 *
 * @param accountId - Cuenta activa; `null` no consulta.
 * @param page - Página, base 1.
 * @param enabled - Si la consulta debe correr; la vista lo ata a `DIRECTORY.READ`.
 * @returns La consulta de TanStack Query con `items` y `pagination`.
 *
 * @example
 * ```ts
 * const contactsQuery = useDirectoryContacts(activeAccount?.id ?? null, page, canRead);
 * ```
 */
export function useDirectoryContacts(
  accountId: string | null,
  page: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...directoryContactsQueryKey(accountId),
      page,
      DIRECTORY_CONTACTS_PAGE_SIZE,
    ],
    queryFn: () =>
      listDirectoryContactsRequest({
        page,
        limit: DIRECTORY_CONTACTS_PAGE_SIZE,
      }),
    enabled: enabled && Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}
