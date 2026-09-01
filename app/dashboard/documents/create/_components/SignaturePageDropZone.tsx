'use client';

import { Page } from 'react-pdf';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PageSizePt } from '@/lib/signature-geometry';
import SignatureBox from './SignatureBox';

export interface PlacedBoxView {
  id: string;
  collaboratorIndex: number;
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  label: string;
  colorClassName: string;
}

interface SignaturePageDropZoneProps {
  pageNumber: number;
  pageWidth: number;
  boxes: PlacedBoxView[];
  rejectedId: string | null;
  rejectionNonce: number;
  onDeleteBox: (collaboratorIndex: number, signatureId: string) => void;
  /**
   * Publica el tamaño en PUNTOS de esta página, ya con su rotación aplicada. De ahí sale el
   * tamaño del cuadro de firma, que es constante en puntos y por lo tanto distinto en ratios
   * según la hoja (ver `signatureBoxRatios`).
   */
  onPageSize: (pageNumber: number, size: PageSizePt) => void;
}

/**
 * Una página del PDF + su zona de suelta (`useDroppable`) + las firmas ya colocadas en ella. El
 * propio nodo droppable ES el ref estable contra el que se mide el drop (ver
 * `resolveSignatureDrop`/`computeDropRatio`) — es el mismo div `shadow-xl` que ya envolvía cada
 * `<Page>` en `PdfPreview.tsx`, así que su rect coincide exactamente con el canvas renderizado.
 */
export default function SignaturePageDropZone({
  pageNumber,
  pageWidth,
  boxes,
  rejectedId,
  rejectionNonce,
  onDeleteBox,
  onPageSize,
}: SignaturePageDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `page-${pageNumber}`,
    data: { pageNumber },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('relative shadow-xl', isOver && 'ring-2 ring-primary/40')}
    >
      <Page
        pageNumber={pageNumber}
        width={pageWidth}
        renderTextLayer
        renderAnnotationLayer
        /**
         * `originalWidth`/`originalHeight` son el viewport a escala 1, que pdf.js construye con la
         * rotación de la página ya aplicada: son los puntos de la hoja TAL COMO SE VE. `width`/
         * `height` no sirven acá porque están escalados al ancho de render, que depende del
         * tamaño de la ventana.
         */
        onLoadSuccess={(page) =>
          onPageSize(pageNumber, {
            width: page.originalWidth,
            height: page.originalHeight,
          })
        }
      />
      {boxes.map((box) => {
        const dndId = `box-${box.collaboratorIndex}-${box.id}`;
        const isRejected = rejectedId === dndId;
        return (
          <SignatureBox
            // Ver SignerChipsBar: cambiar el key remonta el nodo para reiniciar la animación de
            // rechazo en rechazos consecutivos en el mismo lugar.
            key={isRejected ? `${dndId}-reject-${rejectionNonce}` : dndId}
            id={box.id}
            collaboratorIndex={box.collaboratorIndex}
            xRatio={box.xRatio}
            yRatio={box.yRatio}
            widthRatio={box.widthRatio}
            heightRatio={box.heightRatio}
            label={box.label}
            colorClassName={box.colorClassName}
            isRejected={isRejected}
            onDelete={() => onDeleteBox(box.collaboratorIndex, box.id)}
          />
        );
      })}
    </div>
  );
}
