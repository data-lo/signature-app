'use client';

import { useWatch, type Control } from 'react-hook-form';
import { FormSelect } from '@/components/form/form-select';
import {
  SIGNATURE_TYPE_DESCRIPTIONS,
  SIGNATURE_TYPE_OPTIONS,
} from '../_config/signature-type.config';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * Selector del tipo de firma exigido a TODO el documento (historia "Selección de tipo de firma al
 * crear documentos"). Reemplaza al checkbox "¿Requiere firma avanzada (FIEL)?" que vivía en cada
 * firmante: al ser una sola decisión del documento, la combinación de tipos entre firmantes —un
 * tercer flujo mixto que ningún proceso de firma implementa— deja de ser expresable.
 */
export default function SignatureTypeField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const signatureType = useWatch({ control, name: 'signatureType' });

  return (
    <FormSelect
      control={control}
      name="signatureType"
      id="signatureType"
      label="Tipo de firma"
      required
      options={SIGNATURE_TYPE_OPTIONS}
      placeholder="Selecciona el tipo de firma"
      description={SIGNATURE_TYPE_DESCRIPTIONS[signatureType] ?? undefined}
    />
  );
}
