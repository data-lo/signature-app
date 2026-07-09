'use client';

import type { FieldError as RHFFieldError } from 'react-hook-form';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface TextFieldProps extends React.ComponentProps<typeof Input> {
  id: string;
  label: string;
  error?: RHFFieldError;
}

function TextField({ id, label, error, ...props }: TextFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-invalid={!!error} {...props} />
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

export { TextField };
