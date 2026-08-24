'use client';

/**
 * SIN USO desde que "Identidad y firma" pasó al flujo con Didit.
 *
 * Su único consumidor era `IdentitySignatureView`, que ahora dibuja la pantalla a partir de
 * `users.signing_credential_status` con dos tarjetas propias (`DiditVerificationCard` y
 * `SignatureCard`). No hay ninguna ruta que monte este componente.
 *
 * Se conserva a propósito y no se borró junto con el cambio: es la última ruta de la aplicación
 * que permite subir la identificación oficial (INE), que el flujo nuevo no pide porque la
 * captura Didit.
 *
 * Si se decide que la INE queda exclusivamente en manos de Didit, este archivo —junto con los
 * otros marcados igual y sus hooks exclusivos— se puede eliminar completo. Mientras tanto, NO
 * agregarle funcionalidad: cualquier regla nueva sobre identidad o firma va en el flujo de
 * `identity/`, que es el que sí está conectado y el único que respeta la máquina de estados
 * del backend (el endpoint de alta responde 403 salvo en SIGNATURE_PENDING).
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  personalDocumentsSchema,
  type PersonalDocumentsFormValues,
} from '../_schemas';
import {
  INE_DOCUMENT,
  SIGNATURE_DOCUMENT,
} from '../_config/personal-documents.config';
import { useUploadPersonalDocuments } from '../_hooks/useUploadPersonalDocuments';
import PersonalDocumentCard from './PersonalDocumentCard';
import { Form } from '@/components/form/form';

export default function PersonalDocumentsForm() {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<PersonalDocumentsFormValues>({
    resolver: zodResolver(personalDocumentsSchema),
    mode: 'onChange',
  });

  const uploadMutation = useUploadPersonalDocuments();

  const ineFile = watch('ineFile') ?? null;
  const signatureFile = watch('signatureFile') ?? null;

  function handleIneChange(file: File | null) {
    setValue('ineFile', (file ?? undefined) as File, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function handleSignatureChange(file: File | null) {
    setValue('signatureFile', (file ?? undefined) as File, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  return (
    <Form
      className="flex w-full flex-col gap-6"
      onSubmit={handleSubmit((values) => uploadMutation.mutate(values))}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/*
          Sin la etiqueta "(opcional)" en el título: en el estado inicial vacío de "Identidad y
          firma" el encabezado de la sección ya explica que la INE se puede agregar después (ver
          `IdentitySignatureView`), así que repetirlo en la tarjeta solo agregaba ruido. Que la
          INE no sea obligatoria sigue siendo cierto y sigue viviendo donde se hace cumplir: el
          esquema (`_schemas.ts`) solo exige la firma, y el botón de guardar no la espera.
        */}
        <PersonalDocumentCard
          config={INE_DOCUMENT}
          storedUrl={null}
          pendingFile={ineFile}
          error={errors.ineFile?.message}
          onFileChange={handleIneChange}
        />

        <PersonalDocumentCard
          config={SIGNATURE_DOCUMENT}
          storedUrl={null}
          pendingFile={signatureFile}
          error={errors.signatureFile?.message}
          onFileChange={handleSignatureChange}
        />
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto sm:self-start"
        disabled={!isValid || uploadMutation.isPending}
      >
        {uploadMutation.isPending
          ? 'Guardando documentos...'
          : 'Guardar documentos'}
      </Button>
    </Form>
  );
}
