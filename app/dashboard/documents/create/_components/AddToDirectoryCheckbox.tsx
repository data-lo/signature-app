'use client';

import { useId } from 'react';
import type { Control } from 'react-hook-form';
import { FormCheckbox } from '@/components/form/form-checkbox';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface AddToDirectoryCheckboxProps {
  control: Control<CreateDocumentSignaturesFormValues>;
  /** Posición de la tarjeta en `collaborators`; decide qué `addToDirectory` escribe. */
  index: number;
}

/**
 * Checkbox "Agregar al directorio" de una tarjeta de firmante o testigo, enlazado a
 * `collaborators.{index}.addToDirectory`, así que su valor viaja con el documento.
 *
 * Sólo pinta el control: si la tarjeta lo lleva o no lo decide `CollaboratorFormItem` (no aplica
 * a la tarjeta propia ni a un contacto que ya viene del Directorio).
 *
 * @param props - `control` del formulario y posición de la tarjeta.
 * @returns El checkbox con su etiqueta.
 *
 * @throws Nada.
 *
 * @example
 * ```tsx
 * {!isReadOnly && <AddToDirectoryCheckbox control={control} index={index} />}
 * ```
 */
export default function AddToDirectoryCheckbox({
  control,
  index,
}: AddToDirectoryCheckboxProps) {
  // `useId` y no el índice: al reordenar, el índice de una tarjeta cambia y la etiqueta quedaría
  // apuntando al checkbox de otra.
  const checkboxId = useId();

  return (
    <FormCheckbox
      control={control}
      name={`collaborators.${index}.addToDirectory`}
      id={checkboxId}
      label="Agregar al directorio"
    />
  );
}
