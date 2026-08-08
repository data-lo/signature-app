'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { FormFieldShell } from './form-field';

export interface FormTextareaProps<TFieldValues extends FieldValues>
  extends Omit<
    ComponentProps<'textarea'>,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'ref'
  > {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: ReactNode;
  required?: boolean;
  description?: ReactNode;
  containerClassName?: string;
}

/** Equivalente de `FormInput` para texto multilínea (mismo contrato y mismos estilos). */
export function FormTextarea<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  containerClassName,
  id,
  ...textareaProps
}: FormTextareaProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const textareaId = id ?? `field-${name}`;

  return (
    <FormFieldShell
      id={textareaId}
      label={label}
      required={required}
      description={description}
      errorMessage={fieldState.error?.message}
      className={containerClassName}
    >
      <Textarea
        {...textareaProps}
        id={textareaId}
        name={field.name}
        value={field.value == null ? '' : String(field.value)}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        disabled={field.disabled ?? textareaProps.disabled}
        aria-invalid={fieldState.error ? true : undefined}
        aria-required={required || undefined}
      />
    </FormFieldShell>
  );
}
