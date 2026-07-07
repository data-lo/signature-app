'use client';

import { useState, useRef, useCallback, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  scale: number;
  onLoadSuccess: (numPages: number) => void;
  onPageChange: (page: number) => void;
}

function PdfViewer({ url, scale, onLoadSuccess, onPageChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onLoadSuccess(numPages);
  };

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const pages = container.querySelectorAll<HTMLElement>('[data-page-number]');
    const mid = container.scrollTop + container.clientHeight / 2;
    let closest = 1;
    let minDist = Infinity;
    pages.forEach((el) => {
      const dist = Math.abs(el.offsetTop + el.offsetHeight / 2 - mid);
      if (dist < minDist) {
        minDist = dist;
        closest = Number(el.getAttribute('data-page-number'));
      }
    });
    onPageChange(closest);
  }, [onPageChange]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-auto bg-gray-200"
    >
      <div className="flex flex-col items-center py-6 gap-4">
        <Document
          file={url}
          onLoadSuccess={handleLoadSuccess}
          loading={<p className="mt-20 text-gray-500">Cargando documento...</p>}
          error={<p className="mt-20 text-red-500">Error al cargar el documento.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} data-page-number={i + 1} className="shadow-xl">
              <Page
                pageNumber={i + 1}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

export default memo(PdfViewer);
