'use client';

import type { RefObject } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PageSizePt } from '@/lib/signature-geometry';
import LazyPdfPage from '@/components/pdf/LazyPdfPage';
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
  /** Tamaño en puntos de la hoja: reserva su alto aunque todavía no esté dibujada. */
  pageSize: PageSizePt;
  /** Contenedor con scroll del visor (ver `LazyPdfPage`). */
  scrollRootRef: RefObject<HTMLElement | null>;
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
 *
 * La hoja se dibuja sólo cerca de lo visible (`LazyPdfPage`), pero la zona de suelta y las
 * firmas colocadas existen siempre: el recuadro de reserva tiene el tamaño exacto de la hoja, así
 * que los ratios de cada caja apuntan al mismo lugar esté o no dibujada.
 *
 * Ya no publica el tamaño de la página al cargarla: el visor los publica todos juntos al parsear
 * el documento (ver `SignaturePlacementPdfPreview`), porque una hoja sin dibujar no dispararía
 * su `onLoadSuccess`.
 *
 * @param props.pageNumber - Número de página (desde 1).
 * @param props.pageWidth - Ancho de render en píxeles.
 * @param props.pageSize - Tamaño en puntos de la hoja.
 * @param props.scrollRootRef - Contenedor con scroll del visor.
 * @param props.boxes - Firmas colocadas en esta página.
 * @param props.rejectedId - Caja cuyo último arrastre se rechazó.
 * @param props.rejectionNonce - Cambia en cada rechazo.
 * @param props.onDeleteBox - Quita una firma colocada.
 * @returns La página con su zona de suelta y sus firmas.
 *
 * @example
 * ```tsx
 * <SignaturePageDropZone pageNumber={1} pageWidth={520} pageSize={sizes[0]}
 *   scrollRootRef={containerRef} boxes={[]} rejectedId={null} rejectionNonce={0}
 *   onDeleteBox={remove} />
 * ```
 */
export default function SignaturePageDropZone({
  pageNumber,
  pageWidth,
  pageSize,
  scrollRootRef,
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
      className={cn('relative shadow-xl', isOver && 'ring-2 ring-primary/40')}
    >
      <LazyPdfPage
        pageNumber={pageNumber}
        width={pageWidth}
        size={pageSize}
        scrollRootRef={scrollRootRef}
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
