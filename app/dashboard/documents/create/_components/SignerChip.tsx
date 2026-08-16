'use client';

import { useDraggable } from '@dnd-kit/core';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignatureDragPayload } from './resolveSignatureDrop';

interface SignerChipProps {
  collaboratorIndex: number;
  label: string;
  colorClassName: string;
  placedCount: number;
  isRejected: boolean;
}

/**
 * Ícono/chip arrastrable de un firmante en el panel lateral (Escenario 1 de la historia). Nunca
 * se deshabilita tras el primer uso — un firmante puede arrastrarse tantas veces como páginas
 * necesite firmar (Escenario 4: cada arrastre AGREGA una posición nueva, nunca sobreescribe).
 */
export default function SignerChip({
  collaboratorIndex,
  label,
  colorClassName,
  placedCount,
  isRejected,
}: SignerChipProps) {
  const dndId = `chip-${collaboratorIndex}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndId,
    data: { type: 'chip', collaboratorIndex } satisfies SignatureDragPayload,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex touch-none cursor-grab items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium select-none',
        colorClassName,
        isDragging && 'opacity-60',
        isRejected && 'animate-signature-reject border-destructive',
      )}
    >
      <PenLine aria-hidden className="size-3 shrink-0" />
      {label}
      {placedCount > 0 && (
        <span className="flex size-4 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold">
          {placedCount}
        </span>
      )}
    </div>
  );
}
