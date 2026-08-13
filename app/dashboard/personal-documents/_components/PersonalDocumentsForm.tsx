'use client';

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
        <PersonalDocumentCard
          config={INE_DOCUMENT}
          optional
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
