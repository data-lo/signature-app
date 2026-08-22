'use client';

import { useCallback, useState } from 'react';

export interface DocumentFileSelection {
  /** PDF completamente cargado y listo para usarse, o `null` si todavía no hay uno. */
  file: File | null;
  /** FilePond está procesando un archivo localmente (ver `FormFileUpload`). */
  isLoading: boolean;
  /**
   * Páginas del PDF seleccionado, o `null` mientras no se sabe. Lo reporta el visor de ubicación
   * de firmas al terminar de leer el documento (ver `SignaturePlacementPdfPreview`), que es el
   * único punto donde el PDF ya está parseado: contarlas por separado significaría leer y
   * decodificar el archivo dos veces para el mismo dato.
   */
  pageCount: number | null;
  select: (file: File | null) => void;
  setLoading: (isLoading: boolean) => void;
  setPageCount: (pageCount: number | null) => void;
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
  const [pageCount, setPageCount] = useState<number | null>(null);

  const select = useCallback((nextFile: File | null) => {
    setFile(nextFile);
    // El conteo pertenece al archivo anterior: se descarta al cambiarlo para que el resumen no
    // muestre las páginas de un documento que ya no está cargado.
    setPageCount(null);
  }, []);

  const setLoading = useCallback((nextIsLoading: boolean) => {
    setIsLoading(nextIsLoading);
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setIsLoading(false);
    setPageCount(null);
  }, []);

  return {
    file,
    isLoading,
    pageCount,
    select,
    setLoading,
    setPageCount,
    clear,
  };
}
