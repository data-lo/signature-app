'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listDirectoryContactsRequest } from '../_requests';

/** Tamaños de página que ofrece el selector "Contactos por página". */
export const DIRECTORY_PAGE_SIZES = [10, 25, 50] as const;

export type DirectoryPageSize = (typeof DIRECTORY_PAGE_SIZES)[number];

/** Tamaño con el que abre la pantalla; coincide con el `limit` por omisión del backend. */
export const DEFAULT_DIRECTORY_PAGE_SIZE: DirectoryPageSize = 25;

/** Pausa entre la última tecla y la consulta, la misma que la búsqueda de Documentos. */
export const DIRECTORY_SEARCH_DEBOUNCE_MS = 300;

/**
 * Dice si un valor es uno de los tamaños de página ofrecidos.
 *
 * @param value - Lo que devolvió el selector.
 * @returns `true` si es 10, 25 o 50.
 *
 * @example
 * ```ts
 * isDirectoryPageSize(50); // true
 * isDirectoryPageSize(7); // false
 * ```
 */
export function isDirectoryPageSize(value: number): value is DirectoryPageSize {
  return (DIRECTORY_PAGE_SIZES as readonly number[]).includes(value);
}

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
 * Una página de contactos del Directorio de la cuenta activa (`GET /directory/contacts`),
 * filtrada por la búsqueda ya aplicada (no por lo que se va tecleando).
 *
 * Conserva la página anterior mientras llega la siguiente (`keepPreviousData`); la vista la marca
 * con `isPlaceholderData` y pinta la carga en vez de esas filas viejas, pero sigue sabiendo
 * cuántas páginas hay. La búsqueda va recortada en la llave para que `"ana"` y `"ana "` sean la
 * misma consulta.
 *
 * @param params.accountId - Cuenta activa; `null` no consulta.
 * @param params.page - Página, base 1.
 * @param params.limit - Contactos por página.
 * @param params.search - Búsqueda aplicada; vacía lista todo.
 * @param params.enabled - Si la consulta debe correr; la vista lo ata a `DIRECTORY.READ`.
 * @returns La consulta de TanStack Query con `items` y `pagination`.
 *
 * @example
 * ```ts
 * const contactsQuery = useDirectoryContacts({
 *   accountId: activeAccount?.id ?? null,
 *   page: 1,
 *   limit: 25,
 *   search: 'garcia',
 *   enabled: canRead,
 * });
 * ```
 */
export function useDirectoryContacts({
  accountId,
  page,
  limit,
  search,
  enabled,
}: {
  accountId: string | null;
  page: number;
  limit: number;
  search: string;
  enabled: boolean;
}) {
  const trimmedSearch = search.trim();

  return useQuery({
    queryKey: [
      ...directoryContactsQueryKey(accountId),
      { page, limit, search: trimmedSearch },
    ],
    queryFn: () =>
      listDirectoryContactsRequest({ page, limit, search: trimmedSearch }),
    enabled: enabled && Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}
