'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { FormFieldShell } from './form-field';

export interface FormInputProps<TFieldValues extends FieldValues>
  extends Omit<
    ComponentProps<'input'>,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'ref'
  > {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: ReactNode;
  required?: boolean;
  description?: ReactNode;
  /** Clases del contenedor (el campo completo); `className` sigue aplicando al `<input>`. */
  containerClassName?: string;
  /** Normaliza el valor al salir del campo, p. ej. para nombres propios. */
  normalizeOnBlur?: (value: string) => string;
}

/**
 * Campo de texto conectado a react-hook-form por `useController`: muestra etiqueta, valor,
 * estado obligatorio y el mensaje de error del propio campo, sin que el componente que lo usa
 * tenga que leer `formState.errors` ni armar rutas de error a mano.
 *
 * Es agnóstico del formulario que lo consuma (no conoce documentos, ni miembros, ni ningún
 * esquema concreto) y acepta las props nativas de `<input>` — `type`, `placeholder`,
 * `autoComplete`, `disabled`, etc. Para el campo de contraseña con el ojo de "mostrar/ocultar",
 * ver `components/form/text-field.tsx`, que trabaja con `register()` en vez de `control`.
 */
export function FormInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  required,
  description,
  containerClassName,
  normalizeOnBlur,
  id,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const inputId = id ?? `field-${name}`;

  return (
    <FormFieldShell
      id={inputId}
      label={label}
      required={required}
      description={description}
      errorMessage={fieldState.error?.message}
      className={containerClassName}
    >
      {/* Las props nativas van primero: el cableado con react-hook-form no es sobrescribible. */}
      <Input
        {...inputProps}
        id={inputId}
        name={field.name}
        // `null`/`undefined` se normalizan a cadena vacía: un campo opcional del esquema (p. ej.
        // el RFC, que es `nullable`) haría que el input pasara de no controlado a controlado.
        value={field.value == null ? '' : String(field.value)}
        onChange={field.onChange}
        onBlur={() => {
          field.onBlur();
          if (normalizeOnBlur) {
            const normalized = normalizeOnBlur(String(field.value ?? ''));
            if (normalized !== field.value) field.onChange(normalized);
          }
        }}
        ref={field.ref}
        disabled={field.disabled ?? inputProps.disabled}
        aria-invalid={fieldState.error ? true : undefined}
        aria-required={required || undefined}
      />
    </FormFieldShell>
  );
}
