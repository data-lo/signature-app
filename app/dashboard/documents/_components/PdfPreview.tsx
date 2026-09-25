'use client';

import { useEffect, useRef, useState } from 'react';
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

interface PdfPreviewProps {
  file: File | string;
}

const CONTAINER_PADDING = 48;
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;

/**
 * Visor de sólo lectura del PDF (vista de firma y previsualización de documentos).
 *
 * Dibuja sólo las páginas cercanas a lo visible (ver `LazyPdfPage`), muestra el porcentaje de
 * descarga mientras llega el archivo y, si falla, ofrece reintentar sin recargar la pantalla (ver
 * `usePdfDocumentLoader`).
 *
 * @param props.file - URL prefirmada del documento o el `File` local.
 * @returns El panel con scroll y las páginas del documento.
 *
 * @example
 * ```tsx
 * <PdfPreview file={fileUrl} />
 * ```
 */
export default function PdfPreview({ file }: PdfPreviewProps) {
  const loader = usePdfDocumentLoader(file);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(520);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Bug corregido: el contenedor observado tiene scroll propio (overflow-y-auto), así que
    // cambiar el ancho de la página puede hacer aparecer/desaparecer su scrollbar — lo que vuelve
    // a disparar el ResizeObserver y crea un ciclo (parpadeo del PDF en blanco, escalando a
    // "Maximum update depth exceeded"). El umbral de 2px absorbe esa oscilación sin afectar el
    // ajuste real ante un resize genuino; requestAnimationFrame colapsa los resizes continuos
    // (arrastrar el borde de la ventana/devtools) a una actualización por frame en vez de una
    // por evento.
    let frame = 0;
    const updateWidth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = container.clientWidth - CONTAINER_PADDING;
        const next = Math.min(MAX_PAGE_WIDTH, Math.max(MIN_PAGE_WIDTH, available));
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
          // El error real se pinta arriba con su botón de reintento; aquí sólo se evita el texto
          // en inglés que react-pdf muestra por defecto durante el render en que se detecta.
          error={null}
        >
          {loader.pageSizes === null ? (
            <PdfLoadingMessage progress={loader.progress} />
          ) : (
            loader.pageSizes.map((size, i) => (
              <div key={i} className="shadow-xl">
                <LazyPdfPage
                  pageNumber={i + 1}
                  width={pageWidth}
                  size={size}
                  scrollRootRef={containerRef}
                />
              </div>
            ))
          )}
        </Document>
      )}
    </div>
  );
}
