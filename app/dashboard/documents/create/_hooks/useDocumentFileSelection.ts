'use client';

import { useCallback, useState } from 'react';

export interface DocumentFileSelection {
  /** PDF completamente cargado y listo para usarse, o `null` si todavía no hay uno. */
  file: File | null;
  /** FilePond está procesando un archivo localmente (ver `FormFileUpload`). */
  isLoading: boolean;
  select: (file: File | null) => void;
  setLoading: (isLoading: boolean) => void;
  /** Vuelve al estado inicial; el widget de carga se vacía solo al perder el valor. */
  clear: () => void;
}

/**
 * Estado del archivo de la pantalla de carga y configuración. El PDF vive fuera de
 * react-hook-form a propósito: quien lo gobierna es FilePond (que tiene su propio ciclo de
 * carga y validación de tipo/tamaño), y el formulario solo necesita saber si ya hay uno
 * utilizable — ese requisito se expresa como regla de activación en `_section-rules.ts`, no como
 * un campo más del esquema.
 */
export function useDocumentFileSelection(): DocumentFileSelection {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const select = useCallback((nextFile: File | null) => {
    setFile(nextFile);
  }, []);

  const setLoading = useCallback((nextIsLoading: boolean) => {
    setIsLoading(nextIsLoading);
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setIsLoading(false);
  }, []);

  return { file, isLoading, select, setLoading, clear };
}
