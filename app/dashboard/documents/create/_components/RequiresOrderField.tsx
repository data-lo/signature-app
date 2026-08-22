'use client';

import type { Control } from 'react-hook-form';
import { FormSwitch } from '@/components/form/form-switch';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface RequiresOrderFieldProps {
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * "Requiere firmas en orden" (ver historia "Habilitar ordenamiento Drag and Drop para firmantes
 * requeridos"): se puede activar desde la configuración del documento. El orden visual para
 * arrastrar participantes aparece en la tercera sección únicamente cuando ya hay dos o más
 * firmantes (esa condición vive en `CollaboratorsFieldArray`).
 */
export default function RequiresOrderField({
  control,
}: RequiresOrderFieldProps) {
  return (
    <FormSwitch
      control={control}
      name="requiresOrder"
      id="requiresOrder"
      label="Requiere firmas en orden"
      description="Define el orden en que firmarán. Con dos o más firmantes podrás arrastrarlos para acomodarlos."
    />
  );
}
