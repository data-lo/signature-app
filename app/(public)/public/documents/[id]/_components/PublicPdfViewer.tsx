'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Document } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Configura el worker de PDF.js desde el propio origen (ver lib/pdf-worker.ts).
import '@/lib/pdf-worker';
import LazyPdfPage from '@/components/pdf/LazyPdfPage';
import {
  PdfLoadErrorMessage,
  PdfLoadingMessage,
} from '@/components/pdf/PdfDocumentStatus';
import { usePdfDocumentLoader } from '@/components/pdf/use-pdf-document-loader';

interface PublicPdfViewerProps {
  file: string;
  /**
   * Capa opcional sobre cada página (p. ej. dónde va la firma, ver `SignaturePositionsLayer`). Se
   * dibuja dentro de un contenedor `relative` del tamaño de la página.
   */
  renderPageOverlay?: (pageNumber: number) => ReactNode;
}

const CONTAINER_PADDING = 48;
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;

/**
 * Copia deliberada de PdfPreview.tsx (documents/_components) en vez de importarla: esa vista
 * vive bajo el árbol autenticado (app)/documents y ya se duplica a propósito para otros
 * visores de solo lectura (ver SignaturePlacementPdfPreview.tsx) — aquí aplica el mismo criterio
 * para que /public/documents/:id no dependa de nada del árbol autenticado. Lo que sí comparte
 * es `components/pdf/` (páginas diferidas, progreso y reintento), que es global y no pertenece a
 * ningún árbol de rutas.
 *
 * @param props.file - URL pública del documento firmado.
 * @param props.renderPageOverlay - Capa opcional sobre cada página.
 * @returns El panel con scroll y las páginas del documento.
 *
 * @example
 * ```tsx
 * <PublicPdfViewer file={secureUrl} />
 * ```
 */
export default function PublicPdfViewer({
  file,
  renderPageOverlay,
}: PublicPdfViewerProps) {
  const loader = usePdfDocumentLoader(file);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(520);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    const updateWidth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = container.clientWidth - CONTAINER_PADDING;
        const next = Math.min(
          MAX_PAGE_WIDTH,
          Math.max(MIN_PAGE_WIDTH, available),
        );
        setPageWidth((prev) => (Math.abs(prev - next) < 2 ? prev : next));
      });
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col items-center gap-4 overflow-y-auto bg-muted py-6"
    >
      {loader.hasError ? (
        <PdfLoadErrorMessage onRetry={loader.retry} />
      ) : (
        <Document
          key={loader.attempt}
          file={file}
          onLoadProgress={loader.handleLoadProgress}
          onLoadSuccess={loader.handleLoadSuccess}
          onLoadError={loader.handleLoadError}
          loading={<PdfLoadingMessage progress={loader.progress} />}
          // El error se pinta arriba con su botón de reintento (ver PdfPreview).
          error={null}
        >
          {loader.pageSizes === null ? (
            <PdfLoadingMessage progress={loader.progress} />
          ) : (
            loader.pageSizes.map((size, i) => (
              <div key={i} className="relative shadow-xl">
                <LazyPdfPage
                  pageNumber={i + 1}
                  width={pageWidth}
                  size={size}
                  scrollRootRef={containerRef}
                />
                {renderPageOverlay?.(i + 1)}
              </div>
            ))
          )}
        </Document>
      )}
    </div>
  );
}
