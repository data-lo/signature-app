import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Dice si la cuenta activa puede mandar documentos a Búsqueda Inteligente.
 *
 * Lee el interruptor de la organización (`indexDocuments`) de la entrada de la cuenta activa en
 * el catálogo de cuentas, y no del perfil de la organización: el perfil exige
 * `ORGANIZATION.READ` y un miembro que sólo puede crear documentos no lo tiene.
 *
 * Sólo un `false` explícito apaga la búsqueda. Una cuenta personal no tiene interruptor de
 * organización, y una entrada del catálogo cacheada antes del campo no lo trae; en los dos casos
 * decide la casilla de cada documento. El backend aplica la misma regla al crear el documento,
 * así que una entrada vieja no puede colar nada a la búsqueda.
 *
 * @returns `false` si la organización activa desactivó la indexación; `true` en cualquier otro
 *   caso, incluso sin cuenta activa.
 *
 * @example
 * ```ts
 * const isDocumentIndexingEnabled = useDocumentIndexingEnabled();
 * if (!isDocumentIndexingEnabled) return null;
 * ```
 */
export function useDocumentIndexingEnabled(): boolean {
  return useAuthStore((state) => {
    const activeAccountId = state.activeAccount?.id;
    const entry = state.accountsList.find(
      (account) => account.id === activeAccountId,
    );
    return entry?.organizationIndexDocuments !== false;
  });
}
