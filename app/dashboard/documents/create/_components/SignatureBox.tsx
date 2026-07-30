'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignatureDragPayload } from './resolveSignatureDrop';

interface SignatureBoxProps {
  /** id de la firma (React key) — distinto del id de dnd-kit, que se arma a partir de este. */
  id: string;
  collaboratorIndex: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  /** Nombre del firmante — se pinta en MAYÚSCULAS centrado (Escenario 1 de la historia). */
  label: string;
  colorClassName: string;
  isRejected: boolean;
  onDelete: () => void;
}

/**
 * Cuadro delimitador ya colocado — tamaño fijo (ancho/alto en %, derivados directo de los
 * ratios, así que escalan solos con el ancho de página sin recalcular nada). Solo se puede
 * mover (arrastrar) o borrar (botón ×); Escenario 5 de la historia: sin asas ni controles de
 * resize en ningún lado de este componente.
 */
export default function SignatureBox({
  id,
  collaboratorIndex,
  xRatio,
  yRatio,
  widthRatio,
  heightRatio,
  label,
  colorClassName,
  isRejected,
  onDelete,
}: SignatureBoxProps) {
  const dndId = `box-${collaboratorIndex}-${id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dndId,
      data: {
        type: 'box',
        collaboratorIndex,
        signatureId: id,
      } satisfies SignatureDragPayload,
    });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        left: `${xRatio * 100}%`,
        top: `${yRatio * 100}%`,
        width: `${widthRatio * 100}%`,
        height: `${heightRatio * 100}%`,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        'absolute flex touch-none cursor-grab items-center justify-center rounded border-2 bg-white/90 text-center text-[10px] leading-tight font-semibold text-foreground uppercase select-none',
        colorClassName,
        isDragging && 'opacity-0',
        isRejected && 'animate-signature-reject border-destructive',
      )}
    >
      <span className="truncate px-1">{label}</span>
      <button
        type="button"
        aria-label="Eliminar firma"
        className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-destructive text-white"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onDelete}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
