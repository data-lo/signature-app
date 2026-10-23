'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface DocumentsCountContextValue {
  documentsCount: number | null;
  setDocumentsCount: (count: number) => void;
}

const DocumentsCountContext = createContext<DocumentsCountContextValue | null>(
  null,
);

/**
 * Publica el total de documentos de la cuenta activa.
 *
 * El total se limpia al cambiar de cuenta, y no es un detalle: quien lo publica
 * (`useCreatedDocuments`) sólo lo hace cuando su consulta ya tiene datos, así que entre el cambio
 * de cuenta y la respuesta nueva el valor anterior seguiría en pie —un total de la cuenta que se
 * acaba de dejar—. `null` es justamente "todavía no se sabe", que es la verdad durante esa espera.
 *
 * La cuenta se lee del store y no de un contexto de React a propósito: este proveedor envuelve a
 * `AuthProvider` (ver `app/dashboard/layout.tsx`), así que no puede depender de nada que aquél
 * provea. El store de zustand es global y no tiene esa restricción.
 *
 * @param props - Los hijos que consumirán el total.
 * @returns El proveedor del contexto.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DocumentsCountProvider>
 *   <App />
 * </DocumentsCountProvider>
 * ```
 */
export function DocumentsCountProvider({ children }: { children: ReactNode }) {
  const activeAccountId = useAuthStore(
    (state) => state.activeAccount?.id ?? null,
  );
  const [documentsCount, setDocumentsCount] = useState<number | null>(null);

  useEffect(() => {
    setDocumentsCount(null);
  }, [activeAccountId]);

  return (
    <DocumentsCountContext.Provider
      value={{ documentsCount, setDocumentsCount }}
    >
      {children}
    </DocumentsCountContext.Provider>
  );
}

/**
 * Lee el total de documentos publicado por la pantalla de creación.
 *
 * @returns El total (`null` mientras no se sepa) y la función que lo publica.
 * @throws {Error} Si se usa fuera de `DocumentsCountProvider`.
 *
 * @example
 * ```tsx
 * const { documentsCount } = useDocumentsCount();
 * ```
 */
export function useDocumentsCount() {
  const context = useContext(DocumentsCountContext);
  if (!context) {
    throw new Error(
      'useDocumentsCount debe usarse dentro de DocumentsCountProvider',
    );
  }
  return context;
}
