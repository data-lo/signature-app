'use client';

import { useState } from 'react';
import type { FieldError as RHFFieldError } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TextFieldProps extends React.ComponentProps<typeof Input> {
  id: string;
  label: string;
  error?: RHFFieldError;
}

function TextField({ id, label, error, type, className, ...props }: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const input = (
    <Input
      id={id}
      type={isPassword ? (showPassword ? 'text' : 'password') : type}
      aria-invalid={!!error}
      className={cn(isPassword && 'pr-8', className)}
      {...props}
    />
  );

  if (!isPassword) {
    return (
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {input}
        <FieldError errors={error ? [error] : undefined} />
      </Field>
    );
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        {input}
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

export { TextField };
