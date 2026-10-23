'use client';

import type { Control } from 'react-hook-form';
import { FormSwitch } from '@/components/form/form-switch';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface RequiresOrderFieldProps {
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * "Requiere firmas en orden" (ver historia "Habilitar ordenamiento Drag and Drop para firmantes
 * requeridos"): vive en la sección de participantes, justo encima de la lista que gobierna. Se
 * puede activar en cualquier momento, aunque las manijas de arrastre aparezcan únicamente cuando
 * ya hay dos o más firmantes — esa condición vive en `CollaboratorsFieldArray`, no acá: apagar el
 * interruptor por no tener suficientes firmantes todavía perdería una decisión que el usuario ya
 * tomó, y que sigue valiendo en cuanto agregue al segundo.
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
