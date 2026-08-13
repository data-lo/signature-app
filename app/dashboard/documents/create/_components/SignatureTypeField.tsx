'use client';

import { useWatch, type Control } from 'react-hook-form';
import { FormSelect } from '@/components/form/form-select';
import type {
  CreateDocumentSignaturesFormValues,
  DocumentSignatureType,
} from '../_schemas';

/**
 * Las dos únicas opciones del selector (ver `DOCUMENT_SIGNATURE_TYPES`). Se declaran acá y no en
 * el esquema porque son texto de interfaz: el esquema solo conoce los valores válidos.
 */
const SIGNATURE_TYPE_OPTIONS: { value: DocumentSignatureType; label: string }[] =
  [
    { value: 'SIMPLE', label: 'Firma simple' },
    { value: 'ADVANCED', label: 'Firma electrónica avanzada (e.firma)' },
  ];

const DESCRIPTIONS: Record<DocumentSignatureType, string> = {
  SIMPLE:
    'Cada firmante confirma con su rúbrica registrada y un código de verificación enviado por correo.',
  ADVANCED:
    'Cada firmante deberá cargar su certificado (.cer), su llave privada (.key) y la contraseña de su e.firma del SAT al momento de firmar.',
};

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
      description={DESCRIPTIONS[signatureType] ?? undefined}
    />
  );
}
