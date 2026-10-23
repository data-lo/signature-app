'use client';

import type { FormEventHandler } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form } from '@/components/form/form';

interface RejectDocumentFormProps {
  /** `register('reason')` del formulario que gobierna la sección. */
  reasonField: UseFormRegisterReturn;
  errorMessage?: string;
  isRejecting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
}

/** Motivo del rechazo. La validación y el envío los gobierna la sección; aquí solo se dibuja. */
export default function RejectDocumentForm({
  reasonField,
  errorMessage,
  isRejecting,
  onSubmit,
  onCancel,
}: RejectDocumentFormProps) {
  return (
    <Form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg border border-border p-4"
    >
      <p className="text-sm font-medium text-foreground">
        ¿Cuál es el problema con el documento?
      </p>
      <Textarea
        placeholder="Explica detalladamente por qué rechazas este documento."
        {...reasonField}
      />
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isRejecting}>
          {isRejecting ? 'Rechazando...' : 'Rechazar'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Form>
  );
}
