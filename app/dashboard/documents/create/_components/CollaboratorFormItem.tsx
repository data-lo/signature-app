'use client';

import { useWatch, type Control } from 'react-hook-form';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/form/form-input';
import { FormCheckbox } from '@/components/form/form-checkbox';
import {
  COLLABORATOR_EMAIL_FIELD,
  COLLABORATOR_NAME_FIELDS,
  COLLABORATOR_RFC_FIELD,
} from '../_config/collaborator-fields.config';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import type { DragHandleProps } from './SortableCollaboratorItem';

interface CollaboratorFormItemProps {
  index: number;
  control: Control<CreateDocumentSignaturesFormValues>;
  onRemove: () => void;
  /** Posición secuencial (1-based) — solo se pasa cuando "Requiere firmas en orden" está activo. */
  orderIndex?: number;
  /** Solo se pasa junto con `orderIndex`, cuando el reordenamiento por Drag and Drop está activo. */
  dragHandleProps?: DragHandleProps;
}

/**
 * Un bloque del arreglo unificado `collaborators` (ver historia "Frontend: Carga de Documentos
 * y Configuración de Firmantes") — el mismo componente renderiza SIGNER y VIEWER, mostrando
 * solo los campos que aplican a cada uno:
 *  - SIGNER: nombre/apellido/email siempre; el checkbox de 2FA solo cuando el documento exige
 *    firma avanzada — con firma simple, 2FA se fuerza a true sin mostrarse (ver `_mappers/`).
 *  - VIEWER: nombre/apellido/email/RFC siempre, sin nada de firma/2FA/posición.
 *
 * Historia "Selección de tipo de firma al crear documentos": el tipo de firma ya no se elige por
 * firmante (era un checkbox acá) sino una sola vez para todo el documento — este componente solo
 * lo observa, en `signatureType` de la raíz del formulario, para decidir si el 2FA es opcional. El
 * RFC dejó de pedirse a los firmantes avanzados: el flujo de e.firma lo obtiene del certificado al
 * momento de firmar.
 *
 * Los campos se arman desde `_config/collaborator-fields.config.ts` y cada uno resuelve su
 * propio error con `useController` (dentro de `FormInput`), así que este componente ya no
 * recibe ni recorre `formState.errors`.
 */
export default function CollaboratorFormItem({
  index,
  control,
  onRemove,
  orderIndex,
  dragHandleProps,
}: CollaboratorFormItemProps) {
  const collaboratorType = useWatch({
    control,
    name: `collaborators.${index}.collaboratorType`,
  });
  const signatureType = useWatch({ control, name: 'signatureType' });

  const isSigner = collaboratorType === 'SIGNER';
  const isAdvanced = isSigner && signatureType === 'ADVANCED';
  const showRfc = collaboratorType === 'VIEWER';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Arrastrar para reordenar"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          {orderIndex !== undefined && (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              aria-label={`Posición ${orderIndex}`}
            >
              {orderIndex}
            </span>
          )}
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {isSigner ? 'Firmante' : 'Espectador'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label="Quitar participante"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLLABORATOR_NAME_FIELDS.map((field) => (
          <FormInput
            key={field.name}
            control={control}
            name={`collaborators.${index}.${field.name}`}
            label={field.label}
            type={field.type}
            placeholder={field.placeholder}
            required={field.required}
          />
        ))}
      </div>

      <FormInput
        control={control}
        name={`collaborators.${index}.${COLLABORATOR_EMAIL_FIELD.name}`}
        label={COLLABORATOR_EMAIL_FIELD.label}
        type={COLLABORATOR_EMAIL_FIELD.type}
        placeholder={COLLABORATOR_EMAIL_FIELD.placeholder}
        required={COLLABORATOR_EMAIL_FIELD.required}
      />

      {showRfc && (
        <FormInput
          control={control}
          name={`collaborators.${index}.${COLLABORATOR_RFC_FIELD.name}`}
          label={COLLABORATOR_RFC_FIELD.label}
          type={COLLABORATOR_RFC_FIELD.type}
          placeholder={COLLABORATOR_RFC_FIELD.placeholder}
          required={COLLABORATOR_RFC_FIELD.required}
        />
      )}

      {isAdvanced && (
        <FormCheckbox
          control={control}
          name={`collaborators.${index}.requiresTwoFactorAuth`}
          label="Código de verificación (2FA)"
        />
      )}
    </div>
  );
}
