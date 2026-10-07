'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/store/useAuthStore';
import { searchDirectoryContactsRequest } from '../_requests';

/** Pausa tras la última tecla antes de consultar: una petición por palabra, no por letra. */
export const DIRECTORY_SEARCH_DEBOUNCE_MS = 300;

/**
 * Llave de la consulta, con la cuenta activa dentro: el Directorio de una cuenta personal y el de
 * una organización son distintos, y cambiar de cuenta no debe mostrar los resultados de la otra.
 *
 * @param accountId - Cuenta activa, o `null` si todavía no hay ninguna.
 * @param email - Fragmento ya recortado.
 * @returns La llave para `useQuery`.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * directoryContactSearchQueryKey('acc-1', 'garcia'); // ['directoryContactSearch', 'acc-1', 'garcia']
 * ```
 */
export function directoryContactSearchQueryKey(
  accountId: string | null,
  email: string,
) {
  return ['directoryContactSearch', accountId, email] as const;
}

/**
 * Busca en el Directorio de la cuenta activa por fragmento del correo, con una pausa entre teclas.
 *
 * No consulta nada mientras el texto esté vacío (el backend exige un fragmento): ese es el estado
 * "sin búsqueda iniciada" del modal.
 *
 * @param email - Lo escrito en el buscador, tal cual.
 * @returns La consulta de React Query y `term`, el fragmento ya recortado y con la pausa aplicada
 *   (vacío mientras no hay búsqueda).
 *
 * @throws Nada por sí mismo: un fallo llega como `query.isError`.
 *
 * @example
 * ```tsx
 * const { query, term } = useDirectoryContactSearch(input);
 * if (!term) return <EmptyState />;
 * ```
 */
export function useDirectoryContactSearch(email: string) {
  const accountId = useAuthStore((state) => state.activeAccount?.id) ?? null;
  const [term, setTerm] = useState(email.trim());

  useEffect(() => {
    const trimmed = email.trim();
    if (trimmed === '') {
      setTerm('');
      return;
    }
    const timeout = setTimeout(
      () => setTerm(trimmed),
      DIRECTORY_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [email]);

  const query = useQuery({
    queryKey: directoryContactSearchQueryKey(accountId, term),
    queryFn: () => searchDirectoryContactsRequest(term),
    enabled: term !== '',
  });

  return { query, term };
}
