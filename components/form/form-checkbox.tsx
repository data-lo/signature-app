'use client';

import type { ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
} from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormToggleShell } from './form-field';

export interface FormCheckboxProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  /** Acepta nodos (no solo texto) para poder llevar un tooltip o un enlace en la etiqueta. */
  label: ReactNode;
  /** Texto de apoyo debajo del control; puede depender del valor actual (ver consumidores). */
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * Valor que toma el campo al marcarse. Por defecto `true`/`false`, pero permite usar el mismo
   * componente para campos que no son booleanos (p. ej. un enum 'ADVANCED'/'SIMPLE') sin
   * duplicar el cableado con react-hook-form.
   */
  checkedValue?: FieldPathValue<TFieldValues, TName>;
  uncheckedValue?: FieldPathValue<TFieldValues, TName>;
}

/**
 * Checkbox conectado a react-hook-form. Igual que el resto del kit, no conoce ningún formulario
 * concreto: recibe `control` + `name`, muestra su propio error y mantiene los estilos del
 * sistema de diseño.
 */
export function FormCheckbox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  disabled,
  id,
  className,
  checkedValue,
  uncheckedValue,
}: FormCheckboxProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({ control, name });
  const checkboxId = id ?? `field-${name}`;
  const onValue = (checkedValue ?? true) as FieldPathValue<TFieldValues, TName>;
  const offValue = (uncheckedValue ?? false) as FieldPathValue<
    TFieldValues,
    TName
  >;

  return (
    <FormToggleShell
      id={checkboxId}
      label={label}
      description={description}
      errorMessage={fieldState.error?.message}
      className={className}
    >
      <Checkbox
        id={checkboxId}
        name={field.name}
        checked={field.value === onValue}
        onCheckedChange={(isChecked) =>
          field.onChange(isChecked ? onValue : offValue)
        }
        onBlur={field.onBlur}
        disabled={disabled ?? field.disabled}
        aria-invalid={fieldState.error ? true : undefined}
      />
    </FormToggleShell>
  );
}
