'use client';

import { useState } from 'react';
import type { FieldError as RHFFieldError } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TextFieldProps extends Omit<
  React.ComponentProps<typeof Input>,
  'required'
> {
  id: string;
  label: string;
  error?: RHFFieldError;
  /** Ayuda contextual debajo del campo, enlazada con `aria-describedby`. */
  description?: string;
  /**
   * Marca el campo como obligatorio: rótulo "Obligatorio" junto a la etiqueta y
   * `aria-required`. No usa el `required` nativo para no disparar la validación del navegador,
   * que se encimaría con la del esquema.
   */
  required?: boolean;
}

/**
 * Etiqueta del campo, con el rótulo "Obligatorio" cuando corresponde.
 *
 * @param props.id - Id del input al que apunta la etiqueta.
 * @param props.label - Texto de la etiqueta.
 * @param props.required - Si se añade el rótulo "Obligatorio".
 * @returns El `FieldLabel` del campo.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <TextFieldLabel id="name" label="Razón social" required />
 * ```
 */
function TextFieldLabel({
  id,
  label,
  required,
}: {
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <FieldLabel htmlFor={id}>
      {label}
      {required && (
        <span className="text-xs font-normal text-muted-foreground">
          Obligatorio
        </span>
      )}
    </FieldLabel>
  );
}

function TextField({
  id,
  label,
  error,
  description,
  required,
  type,
  className,
  ...props
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const descriptionId = description ? `${id}-description` : undefined;

  const input = (
    <Input
      id={id}
      type={isPassword ? (showPassword ? 'text' : 'password') : type}
      aria-invalid={!!error}
      aria-required={required || undefined}
      aria-describedby={descriptionId}
      className={cn(isPassword && 'pr-8', className)}
      {...props}
    />
  );

  const help = description ? (
    <FieldDescription id={descriptionId}>{description}</FieldDescription>
  ) : null;

  if (!isPassword) {
    return (
      <Field data-invalid={error ? true : undefined}>
        <TextFieldLabel id={id} label={label} required={required} />
        {input}
        {help}
        <FieldError errors={error ? [error] : undefined} />
      </Field>
    );
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <TextFieldLabel id={id} label={label} required={required} />
      <div className="relative">
        {input}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0.5 top-1/2 -translate-y-1/2"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={
            showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
          }
        >
          {showPassword ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {help}
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

export { TextField };
