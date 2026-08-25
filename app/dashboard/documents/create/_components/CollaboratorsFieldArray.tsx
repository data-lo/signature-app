'use client';

import { useEffect } from 'react';
import {
  useController,
  useFieldArray,
  useWatch,
  type Control,
} from 'react-hook-form';
import { UserPlus, Eye } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import CollaboratorFormItem from './CollaboratorFormItem';
import SortableCollaboratorItem from './SortableCollaboratorItem';
import { resolveSelfSignerSync } from '../_mappers/self-signer.mapper';
import {
  countSigners,
  emptySigner,
  emptyViewer,
  isSelfSigner,
  type CreateDocumentSignaturesFormValues,
} from '../_schemas';

interface CollaboratorsFieldArrayProps {
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * Escenario 2 de la historia: firmantes y espectadores viven en un solo arreglo
 * (`collaborators`), diferenciados por `collaboratorType`. Este componente es dueño del arreglo
 * (alta, baja y reordenamiento); los errores de cada campo los muestra cada campo, y el error
 * general de "agrega al menos un firmante" lo muestra la sección que lo envuelve
 * (`DocumentParticipantsSection`).
 */
export default function CollaboratorsFieldArray({
  control,
}: CollaboratorsFieldArrayProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'collaborators',
  });
  const requiresOrder = useWatch({ control, name: 'requiresOrder' });

  // "Incluirme como firmante" se gobierna desde acá porque este componente es el dueño del
  // arreglo: es el único que puede dar de alta y de baja tarjetas sin desincronizar el
  // `useFieldArray`. El checkbox se lee y se escribe con `useController` (no por props) para que
  // `IncludeMeAsSignerField` siga siendo solo el control visual.
  const { field: includeMeAsSigner } = useController({
    control,
    name: 'includeMeAsSigner',
  });
  const currentUserQuery = useCurrentUser();
  const currentUser = currentUserQuery.data;

  useEffect(() => {
    const sync = resolveSelfSignerSync({
      includeMeAsSigner: includeMeAsSigner.value,
      currentUser,
      collaborators: fields,
    });

    if (sync.action === 'add') append(sync.signer);
    else if (sync.action === 'remove') remove(sync.index);
    // Con `fields` en las dependencias el efecto se reevalúa después de cada alta/baja y vuelve a
    // decidir: la segunda vuelta siempre resuelve 'none', así que no se realimenta.
  }, [includeMeAsSigner.value, currentUser, fields, append, remove]);

  /**
   * Quitar la tarjeta propia con su botón de cerrar también desmarca la opción. Si solo se
   * quitara del arreglo, el efecto de arriba la volvería a agregar en el render siguiente (el
   * checkbox seguiría marcado) y el botón se sentiría roto.
   */
  function handleRemove(index: number) {
    if (isSelfSigner(fields[index])) {
      includeMeAsSigner.onChange(false);
      return;
    }
    remove(index);
  }
  // El orden solo cobra sentido cuando hay al menos dos firmantes. El interruptor está justo
  // encima de esta lista (`DocumentParticipantsSection`) y se puede activar antes, pero los
  // controles de arrastre aparecen hasta entonces.
  const canReorder = requiresOrder === true && countSigners(fields) >= 2;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      move(oldIndex, newIndex);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Participantes
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptySigner())}
          >
            <UserPlus className="size-3.5" />
            Firmante
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyViewer())}
          >
            <Eye className="size-3.5" />
            Espectador
          </Button>
        </div>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Agrega al menos un firmante o inclúyete como firmante para continuar.
        </p>
      )}

      {canReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <SortableCollaboratorItem key={field.id} id={field.id}>
                  {(dragHandleProps) => (
                    <CollaboratorFormItem
                      index={index}
                      control={control}
                      onRemove={() => handleRemove(index)}
                      isSelf={isSelfSigner(field)}
                      orderIndex={index + 1}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </SortableCollaboratorItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <CollaboratorFormItem
              key={field.id}
              index={index}
              control={control}
              onRemove={() => handleRemove(index)}
              isSelf={isSelfSigner(field)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
