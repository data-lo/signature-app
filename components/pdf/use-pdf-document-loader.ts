'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageSizePt } from '@/lib/signature-geometry';
import { loadPdfPageSizes } from './pdf-page-sizes';

export interface PdfDocumentLoaded {
  numPages: number;
  pageSizes: PageSizePt[];
}

export interface PdfDocumentLoader {
  /** Cambia en cada reintento: se usa como `key` del `<Document>` para volver a pedir el archivo. */
  attempt: number;
  /** Porcentaje descargado (0–100), o `null` si el origen no informa el tamaño total. */
  progress: number | null;
  /** Tamaño de cada página, o `null` mientras no se conoce. */
  pageSizes: PageSizePt[] | null;
  /** El documento o sus páginas no se pudieron leer; el visor ofrece reintentar. */
  hasError: boolean;
  handleLoadProgress: (args: { loaded: number; total: number }) => void;
  handleLoadSuccess: (pdf: PDFDocumentProxy) => void;
  handleLoadError: (error: Error) => void;
  retry: () => void;
}

/**
 * Estado de carga de un PDF para los visores: progreso de descarga, tamaño de las páginas, error
 * y reintento.
 *
 * Reúne lo que los tres visores (`PdfPreview`, `SignaturePlacementPdfPreview`, `PublicPdfViewer`)
 * necesitan para dibujar sólo las páginas cercanas (ver `LazyPdfPage`): el tamaño de todas las
 * hojas se lee una vez, apenas pdf.js termina de parsear el documento, y hasta entonces el visor
 * sigue en "cargando".
 *
 * El reintento no recarga la página: incrementa `attempt`, que el visor usa como `key` del
 * `<Document>`, y react-pdf vuelve a pedir el archivo (la URL prefirmada o el `File` local).
 * Un resultado que llega tarde —de un archivo anterior o de un intento ya descartado— se ignora.
 *
 * @param file - Origen del PDF; al cambiar se descarta el estado del anterior.
 * @param onLoaded - Se llama una vez por carga exitosa con las páginas y sus tamaños.
 * @returns El estado de carga y los manejadores para conectar al `<Document>` de react-pdf.
 *
 * @example
 * ```tsx
 * const loader = usePdfDocumentLoader(file);
 * <Document key={loader.attempt} file={file} onLoadSuccess={loader.handleLoadSuccess} />
 * ```
 */
export function usePdfDocumentLoader(
  file: unknown,
  onLoaded?: (loaded: PdfDocumentLoaded) => void,
): PdfDocumentLoader {
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [pageSizes, setPageSizes] = useState<PageSizePt[] | null>(null);
  const [hasError, setHasError] = useState(false);
  /** Identifica la carga vigente; cualquier promesa de una carga anterior compara y se descarta. */
  const loadIdRef = useRef(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const resetState = useCallback(() => {
    loadIdRef.current += 1;
    setProgress(null);
    setPageSizes(null);
    setHasError(false);
  }, []);

  /**
   * Se reinicia sólo cuando el archivo cambia de verdad, no al montar: los efectos de los hijos
   * corren antes que los del padre, así que un `<Document>` que ya reportó su resultado durante
   * el montaje lo vería borrado por este reinicio (y un éxito quedaría descartado por `loadId`,
   * con el visor en "cargando" para siempre).
   */
  const previousFileRef = useRef(file);
  useEffect(() => {
    if (previousFileRef.current === file) return;
    previousFileRef.current = file;
    resetState();
  }, [file, resetState]);

  const handleLoadProgress = useCallback(
    ({ loaded, total }: { loaded: number; total: number }) => {
      // Sin `Content-Length` pdf.js informa `total` en 0: no hay porcentaje honesto que mostrar.
      if (total > 0) {
        setProgress(Math.min(100, Math.round((loaded / total) * 100)));
      }
    },
    [],
  );

  const handleLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    const loadId = loadIdRef.current;
    loadPdfPageSizes(pdf)
      .then((sizes) => {
        if (loadId !== loadIdRef.current) return;
        setPageSizes(sizes);
        onLoadedRef.current?.({ numPages: pdf.numPages, pageSizes: sizes });
      })
      .catch(() => {
        if (loadId !== loadIdRef.current) return;
        setHasError(true);
      });
  }, []);

  const handleLoadError = useCallback(() => {
    setHasError(true);
  }, []);

  const retry = useCallback(() => {
    resetState();
    setAttempt((current) => current + 1);
  }, [resetState]);

  return {
    attempt,
    progress,
    pageSizes,
    hasError,
    handleLoadProgress,
    handleLoadSuccess,
    handleLoadError,
    retry,
  };
}
