'use client';

import { useWatch, type Control } from 'react-hook-form';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * "Incluirme como firmante" (ver historia): al activarlo, el usuario en sesión se agrega como
 * SIGNER autocompletado al enviar (ver `_mappers/submission-collaborators.mapper.ts`) sin
 * pedirle que escriba sus datos otra vez. Este componente solo es el checkbox + la leyenda de
 * contexto ("firmas en representación de...") — necesita saber si la cuenta activa es PERSONAL
 * u ORGANIZATION para redactarla, tomado de useAuthStore (mismo store que ya gobierna el
 * selector de cuenta activa en el resto de la app).
 */
export default function IncludeMeAsSignerField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const activeAccount = useAuthStore((state) => state.activeAccount);
  const accountsList = useAuthStore((state) => state.accountsList);
  const includeMeAsSigner = useWatch({ control, name: 'includeMeAsSigner' });

  const activeEntry = accountsList.find(
    (entry) => entry.id === activeAccount?.id,
  );
  const contextLabel =
    activeAccount?.accountType === 'ORGANIZATION'
      ? (activeEntry?.organizationName ?? 'tu organización')
      : 'tu perfil personal';

  return (
    <FormCheckbox
      control={control}
      name="includeMeAsSigner"
      id="includeMeAsSigner"
      label="Incluirme como firmante"
      description={
        includeMeAsSigner ? (
          <>
            Estás firmando este documento en representación de{' '}
            <strong>{contextLabel}</strong>.
          </>
        ) : undefined
      }
    />
  );
}
