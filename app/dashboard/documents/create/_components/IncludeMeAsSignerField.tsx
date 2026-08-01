'use client';

import { Controller, type Control } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * "Incluirme como firmante" (ver historia): al activarlo, `CreateDocumentView` agrega un
 * SIGNER auto-completado con los datos del usuario en sesión (ver `_hooks/useCurrentUser`) sin
 * pedirle que los vuelva a escribir. Este componente solo es el checkbox + la leyenda de
 * contexto ("firmas en representación de...") — necesita saber si la cuenta activa es
 * PERSONAL u ORGANIZATION para redactarla, tomado de useAuthStore (mismo store que ya gobierna
 * el selector de cuenta activa en el resto de la app).
 */
export default function IncludeMeAsSignerField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const accountsList = useAuthStore((state) => state.accountsList);

  const activeEntry = accountsList.find((entry) => entry.id === activeAccount?.id);
  const contextLabel =
    activeAccount?.accountType === 'ORGANIZATION'
      ? (activeEntry?.organizationName ?? 'tu organización')
      : 'tu perfil personal';

  return (
    <Controller
      control={control}
      name="includeMeAsSigner"
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <Field orientation="horizontal" className="items-center">
            <Checkbox
              id="includeMeAsSigner"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <FieldLabel htmlFor="includeMeAsSigner">
              Incluirme como firmante
            </FieldLabel>
          </Field>
          {field.value && (
            <FieldDescription>
              Estás firmando este documento en representación de{' '}
              <strong>{contextLabel}</strong>.
            </FieldDescription>
          )}
        </div>
      )}
    />
  );
}
