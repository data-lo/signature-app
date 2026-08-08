'use client';

import type { ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { FormToggleShell } from './form-field';

export interface FormSwitchProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Interruptor booleano conectado a react-hook-form. Mismo contrato que `FormCheckbox`, para
 * opciones que activan o desactivan un comportamiento del formulario (no un dato del usuario).
 */
export function FormSwitch<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  id,
  className,
}: FormSwitchProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const switchId = id ?? `field-${name}`;

  return (
    <FormToggleShell
      id={switchId}
      label={label}
      description={description}
      errorMessage={fieldState.error?.message}
      className={className}
    >
      <Switch
        id={switchId}
        name={field.name}
        checked={field.value === true}
        onCheckedChange={(isChecked) => field.onChange(isChecked === true)}
        onBlur={field.onBlur}
        disabled={disabled ?? field.disabled}
        aria-invalid={fieldState.error ? true : undefined}
      />
    </FormToggleShell>
  );
}
