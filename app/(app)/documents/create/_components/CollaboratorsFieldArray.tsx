'use client';

import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
import { UserPlus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import CollaboratorFormItem from './CollaboratorFormItem';
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'collaborators',
  });

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
    </div>
  );
}
