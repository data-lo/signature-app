'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/form/text-field';
import { rfcSchema, type RfcFormValues } from '../_schemas';

interface RfcFormProps {
  onSubmit: (rfc: string) => void;
  submitting?: boolean;
}

export default function RfcForm({ onSubmit, submitting }: RfcFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RfcFormValues>({ resolver: zodResolver(rfcSchema) });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values.rfc.toUpperCase()))}
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <TextField
          id="join-rfc"
          label="RFC"
          maxLength={13}
          error={errors.rfc}
          {...register('rfc')}
        />
      </FieldGroup>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Validando...' : 'Continuar'}
      </Button>
    </form>
  );
}
