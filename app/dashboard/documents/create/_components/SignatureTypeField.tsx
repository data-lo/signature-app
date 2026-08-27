'use client';

import { useWatch, type Control } from 'react-hook-form';
import { FormSelect } from '@/components/form/form-select';
import { FormCheckbox } from '@/components/form/form-checkbox';
import SigningCredentialWarning from '@/components/signing/SigningCredentialWarning';
import { useSigningCredential } from '@/lib/hooks/useSigningCredential';
import {
  SIGNATURE_TYPE_DESCRIPTIONS,
  SIGNATURE_TYPE_OPTIONS,
} from '../_config/signature-type.config';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

/**
 * Aviso que aparece al elegir firma Simple sin tener la credencial lista.
 *
 * No impide seguir: el documento se crea igual y puede salir a firmar. Lo que advierte es que
 * quien lo está creando no va a poder firmarlo él mismo hasta configurar su identidad y su
 * firma — algo que sólo importa si además se incluye como firmante, pero que conviene saber
 * antes de mandar la solicitud y no al intentar firmar.
 */
const SIMPLE_SIGNATURE_WARNING =
  'Para firmar documentos es necesario configurar tu identidad y firma.';

/**
 * Selector del tipo de firma exigido a TODO el documento (historia "Selección de tipo de firma al
 * crear documentos"). Reemplaza al checkbox "¿Requiere firma avanzada (FIEL)?" que vivía en cada
 * firmante: al ser una sola decisión del documento, la combinación de tipos entre firmantes —un
 * tercer flujo mixto que ningún proceso de firma implementa— deja de ser expresable.
 *
 * Las dos opciones están siempre disponibles, incluso sin credencial configurada: elegir firma
 * Simple es una decisión sobre cómo firmarán los participantes, no sobre lo que el creador puede
 * hacer hoy.
 */
export default function SignatureTypeField({
  control,
}: {
  control: Control<CreateDocumentSignaturesFormValues>;
}) {
  const signatureType = useWatch({ control, name: 'signatureType' });
  const { isLoading, canSignWithSimpleSignature } = useSigningCredential();

  /**
   * Mientras el perfil no llega no se afirma nada: mostrar el aviso "por si acaso" se lo pondría
   * delante a usuarios que sí tienen su credencial lista, y desaparecería solo un instante
   * después.
   */
  const showWarning =
    signatureType === 'SIMPLE' && !isLoading && !canSignWithSimpleSignature;

  return (
    <>
      <FormSelect
        control={control}
        name="signatureType"
        id="signatureType"
        label="Tipo de firma"
        options={SIGNATURE_TYPE_OPTIONS}
        placeholder="Selecciona una opción"
        description={
          signatureType
            ? SIGNATURE_TYPE_DESCRIPTIONS[signatureType]
            : undefined
        }
      />
      {showWarning && (
        <SigningCredentialWarning
          message={SIMPLE_SIGNATURE_WARNING}
          actionLabel="Configura aquí."
        />
      )}
      {signatureType === 'ADVANCED' && (
        <FormCheckbox
          control={control}
          name="requiresTwoFactorAuth"
          label="Código de verificación (2FA)"
        />
      )}
    </>
  );
}
