'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Configura el worker de PDF.js desde el propio origen (ver lib/pdf-worker.ts).
import '@/lib/pdf-worker';

interface PublicPdfViewerProps {
  file: string;
}

const CONTAINER_PADDING = 48;
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;

/**
 * Copia deliberada de PdfPreview.tsx (documents/_components) en vez de importarla: esa vista
 * vive bajo el árbol autenticado (app)/documents y ya se duplica a propósito para otros
 * visores de solo lectura (ver SignaturePlacementPdfPreview.tsx) — aquí aplica el mismo criterio
 * para que /public/documents/:id no dependa de nada del árbol autenticado.
 */
export default function PublicPdfViewer({ file }: PublicPdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
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
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <p className="mt-20 text-sm text-muted-foreground">
            Cargando documento...
          </p>
        }
        error={
          <p className="mt-20 text-sm text-destructive">
            Error al cargar el documento.
          </p>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} className="shadow-xl">
            <Page
              pageNumber={i + 1}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
