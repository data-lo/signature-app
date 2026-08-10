'use client';

import { useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import { FormSwitch } from '@/components/form/form-switch';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

const MIN_SIGNERS_FOR_ORDER = 2;

interface RequiresOrderFieldProps {
  control: Control<CreateDocumentSignaturesFormValues>;
  signerCount: number;
}

/**
 * "Requiere firmas en orden" (ver historia "Habilitar ordenamiento Drag and Drop para firmantes
 * requeridos"): solo se puede activar con más de MIN_SIGNERS_FOR_ORDER firmantes — con 2 o menos
 * no hay ambigüedad de turno que resolver entre ellos. Si el conteo de firmantes baja de ese
 * umbral mientras el toggle estaba activo (p. ej. el usuario quita un firmante), se apaga solo
 * en vez de quedar en un estado "activo pero deshabilitado" inconsistente.
 */
export default function RequiresOrderField({
  control,
  signerCount,
}: RequiresOrderFieldProps) {
  const canEnable = signerCount > MIN_SIGNERS_FOR_ORDER;
  const { field } = useController({ control, name: 'requiresOrder' });

  useEffect(() => {
    if (!canEnable && field.value) {
      field.onChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnable]);

  return (
    <FormSwitch
      control={control}
      name="requiresOrder"
      id="requiresOrder"
      label="Requiere firmas en orden"
      disabled={!canEnable}
      description={
        canEnable
          ? 'Arrastra a los participantes para definir el orden en que deben firmar.'
          : `Agrega más de ${MIN_SIGNERS_FOR_ORDER} firmantes para poder definir un orden de firma.`
      }
    />
  );
}
