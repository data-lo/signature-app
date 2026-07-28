'use client';

import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
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
import { FieldError } from '@/components/ui/field';
import CollaboratorFormItem from './CollaboratorFormItem';
import SortableCollaboratorItem from './SortableCollaboratorItem';
import {
  emptySigner,
  emptyViewer,
  type CreateDocumentSignaturesFormValues,
} from '../_schemas';

interface CollaboratorsFieldArrayProps {
  control: Control<CreateDocumentSignaturesFormValues>;
  errors: FieldErrors<CreateDocumentSignaturesFormValues>;
}

/** Escenario 2 de la historia: firmantes y espectadores viven en un solo arreglo (`collaborators`), diferenciados por `collaboratorType`. */
export default function CollaboratorsFieldArray({
  control,
  errors,
}: CollaboratorsFieldArrayProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'collaborators',
  });
  const requiresOrder = useWatch({ control, name: 'requiresOrder' });
  const signerCount = fields.filter(
    (field) => field.collaboratorType === 'SIGNER',
  ).length;
  // Espejo de MIN_SIGNERS_FOR_ORDER en RequiresOrderField: sin esta misma condición aquí, el
  // toggle podría quedar en true (estado obsoleto, antes de que su propio useEffect lo apague)
  // mientras esta lista ya no tiene suficientes firmantes para justificar el Drag and Drop.
  const canReorder = requiresOrder === true && signerCount > 2;

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

  const rootError =
    errors.collaborators?.message ??
    (errors.collaborators?.root as { message?: string } | undefined)?.message;

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
          Agrega al menos un firmante para continuar.
        </p>
      )}

      {rootError && <FieldError>{rootError}</FieldError>}

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
                      errors={errors}
                      onRemove={() => remove(index)}
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
              errors={errors}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
