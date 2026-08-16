'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Document } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Configura el worker de PDF.js desde el propio origen (ver lib/pdf-worker.ts).
import '@/lib/pdf-worker';
import SignaturePageDropZone, {
  type PlacedBoxView,
} from './SignaturePageDropZone';

const CONTAINER_PADDING = 48;
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;

interface SignaturePlacementPdfPreviewProps {
  file: File;
  boxesByPage: Map<number, PlacedBoxView[]>;
  rejectedId: string | null;
  rejectionNonce: number;
  onDeleteBox: (collaboratorIndex: number, signatureId: string) => void;
  /**
   * Publica las páginas del documento hacia afuera (encabezado del acordeón y resumen de la
   * solicitud). Este componente ya parsea el PDF para renderizarlo, así que es el único lugar
   * donde ese dato existe sin volver a leer y decodificar el archivo.
   */
  onPageCountChange?: (pageCount: number) => void;
}

/**
 * Variante del render de páginas de `PdfPreview.tsx` con una zona de suelta por página (ver
 * historia "Ubicación de firmas por usuario") — se duplica la lógica de `ResizeObserver`/
 * `pageWidth` a propósito en vez de modificar `PdfPreview.tsx`, que sigue usándose tal cual, sin
 * interactividad, en las vistas de solo lectura (firma y previsualización de documentos
 * firmados).
 */
function SignaturePlacementPdfPreview({
  file,
  boxesByPage,
  rejectedId,
  rejectionNonce,
  onDeleteBox,
  onPageCountChange,
}: SignaturePlacementPdfPreviewProps) {
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
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          onPageCountChange?.(numPages);
        }}
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
        {Array.from({ length: numPages }, (_, i) => {
          const pageNumber = i + 1;
          return (
            <SignaturePageDropZone
              key={pageNumber}
              pageNumber={pageNumber}
              pageWidth={pageWidth}
              boxes={boxesByPage.get(pageNumber) ?? []}
              rejectedId={rejectedId}
              rejectionNonce={rejectionNonce}
              onDeleteBox={onDeleteBox}
            />
          );
        })}
      </Document>
    </div>
  );
}

export default memo(SignaturePlacementPdfPreview);
