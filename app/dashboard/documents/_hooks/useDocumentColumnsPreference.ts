'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
  documentColumnsStorageKey,
  isDefaultDocumentColumns,
  parseStoredDocumentColumns,
  setDocumentColumnVisibility,
  type DocumentColumnId,
} from '../_config/columns';

/**
 * Copia en memoria de lo que no se pudo escribir en `localStorage` (modo privado, cuota llena,
 * almacenamiento bloqueado), o de lo que se eligió antes de conocer al usuario. Gana sobre
 * `localStorage`: si la escritura falló, lo guardado allí es la preferencia anterior.
 */
const memoryPreferences = new Map<string, string>();

/** Clave en memoria mientras todavía no se sabe quién es el usuario. */
const ANONYMOUS_MEMORY_KEY = 'documents-table-columns:anonymous';

/** Componentes suscritos a cambios hechos desde esta misma pestaña. */
const listeners = new Set<() => void>();

/**
 * Avisa a los componentes suscritos que la preferencia cambió en esta pestaña.
 *
 * @returns Nada.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * notifyListeners();
 * ```
 */
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Se suscribe a los cambios de preferencia: los de esta pestaña y, por el evento `storage`, los
 * de otras pestañas del mismo usuario.
 *
 * @param listener - Se llama en cada cambio; `useSyncExternalStore` vuelve a leer la preferencia.
 * @returns La función que cancela la suscripción.
 *
 * @throws Nada.
 *
 * @example
 * ```ts
 * const unsubscribe = subscribe(() => console.log('cambió'));
 * unsubscribe();
 * ```
 */
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Lee el valor crudo de la preferencia: primero la copia en memoria y, si no la hay,
 * `localStorage`.
 *
 * @param storageKey - Clave del usuario; `null` mientras no se le conoce.
 * @returns El JSON guardado, o `null` si no hay nada.
 *
 * @throws Nada: un `localStorage` inaccesible cuenta como vacío.
 *
 * @example
 * ```ts
 * readPreference('documents-table-columns:user-1'); // '["index","document"]'
 * ```
 */
function readPreference(storageKey: string | null): string | null {
  const memoryKey = storageKey ?? ANONYMOUS_MEMORY_KEY;
  if (memoryPreferences.has(memoryKey)) {
    return memoryPreferences.get(memoryKey) ?? null;
  }
  if (!storageKey) return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * Guarda (o borra, con `null`) la preferencia y avisa a los suscritos. Si `localStorage` falla,
 * la guarda en memoria.
 *
 * @param storageKey - Clave del usuario; `null` mientras no se le conoce (sólo memoria).
 * @param value - JSON de las columnas visibles, o `null` para volver a la predeterminada.
 * @returns Nada.
 *
 * @throws Nada: los errores de almacenamiento se resuelven con la copia en memoria.
 *
 * @example
 * ```ts
 * writePreference('documents-table-columns:user-1', '["document"]');
 * writePreference('documents-table-columns:user-1', null);
 * ```
 */
function writePreference(storageKey: string | null, value: string | null) {
  const memoryKey = storageKey ?? ANONYMOUS_MEMORY_KEY;
  memoryPreferences.delete(memoryKey);
  let persisted = false;
  if (storageKey) {
    try {
      if (value === null) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, value);
      persisted = true;
    } catch {
      // Sin almacenamiento la preferencia sigue funcionando durante la sesión; sólo no
      // sobrevive a la recarga.
    }
  }
  if (!persisted && value !== null) memoryPreferences.set(memoryKey, value);
  notifyListeners();
}

/** Lo que devuelve `useDocumentColumnsPreference`. */
export interface DocumentColumnsPreference {
  /** Columnas visibles, en el orden de la tabla. */
  visibleColumns: readonly DocumentColumnId[];
  /** Muestra u oculta una columna; las que no se pueden ocultar se ignoran. */
  setColumnVisibility: (columnId: DocumentColumnId, visible: boolean) => void;
  /** Vuelve a la configuración predeterminada y borra la preferencia guardada. */
  resetColumns: () => void;
  /** Si la configuración actual es la predeterminada. */
  isDefault: boolean;
}

/**
 * Preferencia de columnas visibles de la tabla de documentos para el usuario en sesión.
 *
 * Se guarda en `localStorage` bajo una clave por usuario (ver `documentColumnsStorageKey`) y se
 * restaura al recargar. Sin preferencia guardada —o con una ilegible— se usa
 * `DEFAULT_VISIBLE_DOCUMENT_COLUMNS`.
 *
 * Lee el almacenamiento con `useSyncExternalStore`: en el servidor y durante la hidratación se
 * pinta la configuración predeterminada (el servidor no ve `localStorage`) y justo después la
 * guardada, sin desajustes de hidratación. Un cambio en otra pestaña también se refleja aquí.
 *
 * @returns Las columnas visibles y las acciones para cambiarlas (ver `DocumentColumnsPreference`).
 *
 * @throws Nada: si `localStorage` no está disponible, la preferencia vive sólo en memoria.
 *
 * @example
 * ```tsx
 * const { visibleColumns, setColumnVisibility, resetColumns } = useDocumentColumnsPreference();
 * setColumnVisibility('signedAt', false);
 * <DocumentsTable visibleColumns={visibleColumns} … />
 * ```
 */
export function useDocumentColumnsPreference(): DocumentColumnsPreference {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const storageKey = userId ? documentColumnsStorageKey(userId) : null;

  const raw = useSyncExternalStore(
    subscribe,
    () => readPreference(storageKey),
    () => null,
  );

  const visibleColumns = useMemo(
    () => parseStoredDocumentColumns(raw) ?? DEFAULT_VISIBLE_DOCUMENT_COLUMNS,
    [raw],
  );

  const setColumnVisibility = useCallback(
    (columnId: DocumentColumnId, visible: boolean) => {
      const current =
        parseStoredDocumentColumns(readPreference(storageKey)) ??
        DEFAULT_VISIBLE_DOCUMENT_COLUMNS;
      writePreference(
        storageKey,
        JSON.stringify(setDocumentColumnVisibility(current, columnId, visible)),
      );
    },
    [storageKey],
  );

  const resetColumns = useCallback(
    () => writePreference(storageKey, null),
    [storageKey],
  );

  return {
    visibleColumns,
    setColumnVisibility,
    resetColumns,
    isDefault: isDefaultDocumentColumns(visibleColumns),
  };
}
