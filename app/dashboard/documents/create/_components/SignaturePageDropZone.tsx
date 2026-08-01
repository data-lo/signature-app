'use client';

import { Page } from 'react-pdf';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
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
}: SignaturePageDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `page-${pageNumber}`,
    data: { pageNumber },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative shadow-xl',
        isOver && 'ring-2 ring-primary/40',
      )}
    >
      <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer renderAnnotationLayer />
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
