'use client';

import { useState } from 'react';
import type { FieldError as RHFFieldError } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  id: string;
  label: string;
  error?: RHFFieldError;
}

/**
 * Campo de contraseña con botón de mostrar/ocultar (Eye/EyeOff, ver historia
 * "Recuperación de Contraseña mediante Código de Verificación OTP") — componente
 * explícito y nombrado (a diferencia de un `type="password"` detectado implícitamente
 * en TextField), para poder reutilizarlo puntualmente donde se pida por nombre.
 */
function PasswordInput({
  id,
  label,
  error,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={!!error}
          className={cn('pr-8', className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0.5 top-1/2 -translate-y-1/2"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

export { PasswordInput };
