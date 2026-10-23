'use client';

import type { ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormFieldShell } from './form-field';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: ReactNode;
  required?: boolean;
  description?: ReactNode;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Selector conectado a react-hook-form. Las opciones se pasan como datos (`options`) en vez de
 * como hijos para que un formulario pueda declararlas desde su configuración de campos; el valor
 * viaja siempre como `string` (cadena vacía = sin selección), que es lo que esperan los esquemas
 * de Zod que validan ids.
 */
export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  options,
  placeholder,
  disabled,
  id,
  className,
  containerClassName,
}: FormSelectProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const selectId = id ?? `field-${name}`;
  // `@base-ui/react` distingue "sin valor" (`null`) de la cadena vacía: con `''` el trigger
  // dejaría de mostrar el placeholder.
  const value = field.value ? String(field.value) : null;

  return (
    <FormFieldShell
      id={selectId}
      label={label}
      required={required}
      description={description}
      errorMessage={fieldState.error?.message}
      className={containerClassName}
    >
      {/*
        `items` es lo que hace que el trigger muestre la ETIQUETA de la opción elegida y no su
        valor: sin esta prop, `<Select.Value>` de @base-ui/react renderiza el valor crudo (su
        documentación: "When specified, `<Select.Value>` renders the label of the selected item
        instead of the raw value"). Se veía "SIMPLE" en vez de "Firma simple" y, donde el valor es
        un id, el UUID del registro. Recibe el mismo arreglo `options` que alimenta la lista, así
        que etiqueta y opción no pueden discrepar.
      */}
      <Select
        items={options}
        value={value}
        onValueChange={(nextValue) => field.onChange(nextValue ?? '')}
        disabled={disabled ?? field.disabled}
      >
        <SelectTrigger
          id={selectId}
          className={className ?? 'w-full'}
          onBlur={field.onBlur}
          aria-invalid={fieldState.error ? true : undefined}
          aria-required={required || undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldShell>
  );
}
