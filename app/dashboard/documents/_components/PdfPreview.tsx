'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  file: File | string;
}

const CONTAINER_PADDING = 48;
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;

export default function PdfPreview({ file }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0);
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
