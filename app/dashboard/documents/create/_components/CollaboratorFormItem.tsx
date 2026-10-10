'use client';

import { useId, useState } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput } from '@/components/form/form-input';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { formatPersonName } from '@/lib/format-person-name';
import {
  COLLABORATOR_EMAIL_FIELD,
  COLLABORATOR_NAME_FIELDS,
  COLLABORATOR_TAX_ID_FIELD,
} from '../_config/collaborator-fields.config';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import type { DragHandleProps } from './SortableCollaboratorItem';
import { FormToggleShell } from '@/components/form/form-field';

interface CollaboratorFormItemProps {
  index: number;
  control: Control<CreateDocumentSignaturesFormValues>;
  onRemove: () => void;
  /**
   * Es la tarjeta del usuario en sesión, creada por "Incluirme como firmante". Sus datos salen
   * del perfil, no se capturan: se muestran en solo lectura para que se vean (el criterio de la
   * historia es que la tarjeta muestre los datos disponibles) sin sugerir que editarlos acá
   * cambiaría algo — el perfil se edita en su propia pantalla.
   */
  isSelf?: boolean;
  /** Posición secuencial (1-based) — solo se pasa cuando "Requiere firmas en orden" está activo. */
  orderIndex?: number;
  /** Solo se pasa junto con `orderIndex`, cuando el reordenamiento por Drag and Drop está activo. */
  dragHandleProps?: DragHandleProps;
}

/**
 * Un bloque del arreglo unificado `collaborators` (ver historia "Frontend: Carga de Documentos
 * y Configuración de Firmantes") — el mismo componente renderiza SIGNER y WITNESS, mostrando
 * solo los campos que aplican a cada uno:
 *  - SIGNER: nombre/apellido/email siempre; la configuración de 2FA aplica a todo el documento
 *    y se decide en la segunda sección.
 *  - WITNESS: nombre/apellido/email/RFC siempre, sin nada de firma/2FA/posición.
 *
 * Historia "Selección de tipo de firma al crear documentos": el tipo de firma ya no se elige por
 * firmante (era un checkbox acá) sino una sola vez para todo el documento. El
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
  isSelf = false,
  orderIndex,
  dragHandleProps,
}: CollaboratorFormItemProps) {
  // `useId` y no el índice: al reordenar, el índice de una tarjeta cambia y la etiqueta quedaría
  // apuntando al checkbox de otra.
  const addToDirectoryId = useId();
  const collaboratorType = useWatch({
    control,
    name: `collaborators.${index}.collaboratorType`,
  });
  const source = useWatch({
    control,
    name: `collaborators.${index}.source`,
  });
  const isSigner = collaboratorType === 'SIGNER';
  // Elegido del Directorio con usuario vinculado: su identidad la resuelve el backend desde ese
  // usuario, así que en pantalla se muestra en solo lectura y no lleva RFC ni "Agregar al
  // directorio" (ya está en él). Ver historia "Enviar colaboradores desde Directorio mediante
  // usuario vinculado al crear un documento".
  const isFromDirectory = source === 'DIRECTORY';
  const isReadOnly = isSelf || isFromDirectory;
  const showTaxId = collaboratorType === 'WITNESS' && !isFromDirectory;

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
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            {isSigner ? 'Firmante' : 'Testigo'}
          </span>
          {isSelf && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Tú
            </span>
          )}
          {isFromDirectory && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
              Directorio
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={isSelf ? 'Quitarme como firmante' : 'Quitar participante'}
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
            normalizeOnBlur={formatPersonName}
            disabled={isReadOnly}
          />
        ))}
      </div>

      <FormInput
        control={control}
        name={`collaborators.${index}.${COLLABORATOR_EMAIL_FIELD.name}`}
        label={COLLABORATOR_EMAIL_FIELD.label}
        type={COLLABORATOR_EMAIL_FIELD.type}
        placeholder={COLLABORATOR_EMAIL_FIELD.placeholder}
        disabled={isReadOnly}
      />

      {showTaxId && (
        <FormInput
          control={control}
          name={`collaborators.${index}.${COLLABORATOR_TAX_ID_FIELD.name}`}
          label={COLLABORATOR_TAX_ID_FIELD.label}
          type={COLLABORATOR_TAX_ID_FIELD.type}
          placeholder={COLLABORATOR_TAX_ID_FIELD.placeholder}
        />
      )}

      {!isReadOnly && (
        <FormCheckbox
          control={control}
          name={`collaborators.${index}.addToDirectory`}
          id={addToDirectoryId}
          label="Agregar al directorio"
        />
      )}
    </div>
  );
}