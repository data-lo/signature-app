'use client';

import { useWatch, type Control } from 'react-hook-form';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { useAuthStore } from '@/lib/store/useAuthStore';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * "Incluirme como firmante" (ver historia): al activarlo, el usuario en sesión aparece de
 * inmediato como una tarjeta SIGNER autocompletada en la lista de participantes, y al desactivarlo
 * esa tarjeta se quita. Este componente es solo el control visual: el alta y la baja las hace
 * `CollaboratorsFieldArray`, que es el dueño del arreglo `collaborators` (ver
 * `_mappers/self-signer.mapper.ts` para las reglas).
 *
 * Lo único propio de acá es la leyenda de contexto ("firmas en representación de...") — necesita
 * saber si la cuenta activa es PERSONAL u ORGANIZATION para redactarla, tomado de useAuthStore
 * (mismo store que ya gobierna el selector de cuenta activa en el resto de la app).
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
  const isOrganization = activeAccount?.accountType === 'ORGANIZATION';
  const organizationName = activeEntry?.organizationName ?? 'tu organización';

  return (
    <FormCheckbox
      control={control}
      name="includeMeAsSigner"
      id="includeMeAsSigner"
      label="Incluirme como firmante"
      description={
        includeMeAsSigner ? (
          isOrganization ? (
            <>
              Firmarás este documento en nombre de{' '}
              <strong>{organizationName}</strong>.
            </>
          ) : (
            'Firmarás este documento con tu perfil personal.'
          )
        ) : undefined
      }
    />
  );
}
