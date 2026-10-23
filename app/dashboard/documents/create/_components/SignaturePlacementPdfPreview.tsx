'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Document } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Configura el worker de PDF.js desde el propio origen (ver lib/pdf-worker.ts).
import '@/lib/pdf-worker';
import type { PageSizePt } from '@/lib/signature-geometry';
import {
  PdfLoadErrorMessage,
  PdfLoadingMessage,
} from '@/components/pdf/PdfDocumentStatus';
import { usePdfDocumentLoader } from '@/components/pdf/use-pdf-document-loader';
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
  /**
   * Tamaño en puntos de cada página. Se publican todas juntas en cuanto el PDF termina de
   * parsearse (ver `usePdfDocumentLoader`), no conforme se dibuja cada hoja: el visor sólo dibuja
   * las cercanas a lo visible, y el tamaño de una hoja todavía sin dibujar también hace falta.
   */
  onPageSize: (pageNumber: number, size: PageSizePt) => void;
}

/**
 * Variante del render de páginas de `PdfPreview.tsx` con una zona de suelta por página (ver
 * historia "Ubicación de firmas por usuario") — se duplica la lógica de `ResizeObserver`/
 * `pageWidth` a propósito en vez de modificar `PdfPreview.tsx`, que sigue usándose tal cual, sin
 * interactividad, en las vistas de solo lectura (firma y previsualización de documentos
 * firmados).
 *
 * Comparte con esos visores `components/pdf/`: dibujo diferido de páginas, progreso de carga y
 * reintento ante error.
 *
 * @param props.file - PDF local recién cargado por el usuario.
 * @param props.boxesByPage - Firmas ya colocadas, agrupadas por página.
 * @param props.rejectedId - Caja cuyo último arrastre se rechazó (para animarla).
 * @param props.rejectionNonce - Cambia en cada rechazo, para reiniciar la animación.
 * @param props.onDeleteBox - Quita una firma colocada.
 * @param props.onPageCountChange - Recibe el número de páginas al cargar el documento.
 * @param props.onPageSize - Recibe el tamaño de cada página al cargar el documento.
 * @returns El panel con scroll y una zona de suelta por página.
 *
 * @example
 * ```tsx
 * <SignaturePlacementPdfPreview file={file} boxesByPage={boxes} rejectedId={null}
 *   rejectionNonce={0} onDeleteBox={remove} onPageSize={setSize} />
 * ```
 */
function SignaturePlacementPdfPreview({
  file,
  boxesByPage,
  rejectedId,
  rejectionNonce,
  onDeleteBox,
  onPageCountChange,
  onPageSize,
}: SignaturePlacementPdfPreviewProps) {
  const loader = usePdfDocumentLoader(file, ({ numPages, pageSizes }) => {
    onPageCountChange?.(numPages);
    pageSizes.forEach((size, i) => onPageSize(i + 1, size));
  });
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
            loader.pageSizes.map((size, i) => {
              const pageNumber = i + 1;
              return (
                <SignaturePageDropZone
                  key={pageNumber}
                  pageNumber={pageNumber}
                  pageWidth={pageWidth}
                  pageSize={size}
                  scrollRootRef={containerRef}
                  boxes={boxesByPage.get(pageNumber) ?? []}
                  rejectedId={rejectedId}
                  rejectionNonce={rejectionNonce}
                  onDeleteBox={onDeleteBox}
                />
              );
            })
          )}
        </Document>
      )}
    </div>
  );
}

export default memo(SignaturePlacementPdfPreview);
