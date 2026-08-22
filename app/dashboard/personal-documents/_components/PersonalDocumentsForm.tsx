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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import {
  personalDocumentsSchema,
  type PersonalDocumentsFormValues,
} from '../_schemas';
import { useUploadPersonalDocuments } from '../_hooks/useUploadPersonalDocuments';
import DocumentDropzone from './DocumentDropzone';
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
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Documentos personales</CardTitle>
        <CardDescription>
          Sube tu firma digital para completar tu perfil. La identificación
          oficial (INE) es opcional y puedes agregarla después.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={handleSubmit((values) => uploadMutation.mutate(values))}
        >
          <FieldGroup>
            <DocumentDropzone
              id="ineFile"
              label="Identificación (INE) (opcional)"
              hint="PDF, JPG o PNG. Máximo 20MB."
              accept="application/pdf,image/jpeg,image/png"
              file={ineFile}
              error={errors.ineFile?.message}
              onFileChange={handleIneChange}
              maxFileSizeMB={20}
            />

            <DocumentDropzone
              id="signatureFile"
              label="Firma digital"
              hint="Formato PNG. Máximo 10MB."
              accept="image/png"
              file={signatureFile}
              error={errors.signatureFile?.message}
              onFileChange={handleSignatureChange}
              maxFileSizeMB={10}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || uploadMutation.isPending}
            >
              {uploadMutation.isPending
                ? 'Guardando documentos...'
                : 'Guardar documentos'}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  );
}
