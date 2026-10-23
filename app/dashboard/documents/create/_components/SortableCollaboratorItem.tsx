'use client';

import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';

export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

interface SortableCollaboratorItemProps {
  id: string;
  children: (dragHandleProps: DragHandleProps) => ReactNode;
}

/**
 * Envuelve cada tarjeta de `CollaboratorFormItem` con `useSortable` (ver historia "Habilitar
 * ordenamiento Drag and Drop para firmantes requeridos") sin acoplar dnd-kit al propio
 * `CollaboratorFormItem` — este último solo recibe `attributes`/`listeners` ya resueltos para
 * pintar el drag handle, y no necesita saber que dnd-kit existe.
 */
export default function SortableCollaboratorItem({
  id,
  children,
}: SortableCollaboratorItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : undefined}
    >
      {children({ attributes, listeners })}
    </div>
  );
}
