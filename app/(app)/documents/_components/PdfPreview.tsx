'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  file: File | string;
}

export default function PdfPreview({ file }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0);

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto bg-muted py-6">
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
              width={520}
              renderTextLayer
              renderAnnotationLayer
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
