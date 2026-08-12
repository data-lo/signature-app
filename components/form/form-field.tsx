'use client';

import type { ReactNode } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

export interface FormFieldShellProps {
  /** Debe coincidir con el `id` del control que envuelve, para asociar la etiqueta. */
  id: string;
  label?: ReactNode;
  /** Marca visual de campo obligatorio; la validación real la define el esquema. */
  required?: boolean;
  description?: ReactNode;
  /** Mensaje de error del campo (normalmente `fieldState.error?.message`). */
  errorMessage?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Envoltura común de los campos del kit de formulario (`FormInput`, `FormSelect`,
 * `FormTextarea`, `FormFileUpload`): etiqueta + marca de obligatorio + control + descripción +
 * error, con los estilos del sistema de diseño (`components/ui/field`). No sabe nada de
 * react-hook-form ni de ningún formulario en particular — recibe el mensaje de error ya
 * resuelto, para poder usarse también con estado local.
 */
export function FormFieldShell({
  id,
  label,
  required,
  description,
  errorMessage,
  className,
  children,
}: FormFieldShellProps) {
  return (
    <Field data-invalid={errorMessage ? true : undefined} className={className}>
      {label !== undefined && (
        <FieldLabel htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          )}
        </FieldLabel>
      )}
      {children}
      {description !== undefined && (
        <FieldDescription>{description}</FieldDescription>
      )}
      <FieldError
        errors={errorMessage ? [{ message: errorMessage }] : undefined}
      />
    </Field>
  );
}

export interface FormToggleShellProps {
  /** Debe coincidir con el `id` del control (checkbox/switch) que envuelve. */
  id: string;
  label: ReactNode;
  description?: ReactNode;
  errorMessage?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Envoltura de los controles booleanos del kit (`FormCheckbox`, `FormSwitch`): el control y su
 * etiqueta en línea, con la descripción y el error debajo. Se separa de `FormFieldShell` porque
 * la etiqueta va a la derecha del control, no arriba.
 */
export function FormToggleShell({
  id,
  label,
  description,
  errorMessage,
  className,
  children,
}: FormToggleShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Field orientation="horizontal" className="items-center">
        {children}
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      </Field>
      {description !== undefined && (
        <FieldDescription>{description}</FieldDescription>
      )}
      <FieldError
        errors={errorMessage ? [{ message: errorMessage }] : undefined}
      />
    </div>
  );
}
