'use client';

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
          Sube tu identificación oficial (INE) y tu firma digital para completar
          tu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) => uploadMutation.mutate(values))}
        >
          <FieldGroup>
            <DocumentDropzone
              id="ineFile"
              label="Identificación (INE)"
              hint="PDF, JPG o PNG. Máximo 5MB."
              accept="application/pdf,image/jpeg,image/png"
              file={ineFile}
              error={errors.ineFile?.message}
              onFileChange={handleIneChange}
            />

            <DocumentDropzone
              id="signatureFile"
              label="Firma digital"
              hint="Formato PNG. Máximo 5MB."
              accept="image/png"
              file={signatureFile}
              error={errors.signatureFile?.message}
              onFileChange={handleSignatureChange}
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
        </form>
      </CardContent>
    </Card>
  );
}
