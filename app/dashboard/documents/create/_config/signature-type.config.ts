import type { DocumentSignatureType } from '../_schemas';

/**
 * Texto de interfaz de los dos únicos tipos de firma (ver `DOCUMENT_SIGNATURE_TYPES`): el esquema
 * solo conoce los valores válidos, las etiquetas viven acá.
 *
 * Están en `_config/` y no dentro de `SignatureTypeField` porque hay dos consumidores que no
 * pueden discrepar: el selector que las ofrece y el resumen/encabezado del acordeón que muestra
 * el tipo ya elegido (ver `_section-progress.ts`).
 */
export const SIGNATURE_TYPE_LABELS: Record<DocumentSignatureType, string> = {
  SIMPLE: 'Firma simple',
  ADVANCED: 'Firma electrónica avanzada (e.firma)',
};

export const SIGNATURE_TYPE_DESCRIPTIONS: Record<DocumentSignatureType, string> =
  {
    SIMPLE:
      'Cada firmante confirma con su rúbrica registrada y un código de verificación enviado por correo.',
    ADVANCED:
      'Cada firmante deberá cargar su certificado (.cer), su llave privada (.key) y la contraseña de su e.firma del SAT al momento de firmar.',
  };

export const SIGNATURE_TYPE_OPTIONS: {
  value: DocumentSignatureType;
  label: string;
}[] = (
  Object.keys(SIGNATURE_TYPE_LABELS) as DocumentSignatureType[]
).map((value) => ({ value, label: SIGNATURE_TYPE_LABELS[value] }));
