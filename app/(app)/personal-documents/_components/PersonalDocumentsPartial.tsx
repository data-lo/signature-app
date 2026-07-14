'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CurrentUser } from '@/lib/api/auth';
import { ineFileSchema, signatureFileSchema } from '../_schemas';
import { useDeletePersonalDocument } from '../_hooks/useDeletePersonalDocument';
import { useUpdatePersonalDocument } from '../_hooks/useUpdatePersonalDocument';
import DocumentDropzone from './DocumentDropzone';
import DocumentPreviewItem from './DocumentPreviewItem';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface PersonalDocumentsPartialProps {
  signature: NonNullable<CurrentUser['signature']> | null;
  officialFile: NonNullable<CurrentUser['officialFile']> | null;
}

export default function PersonalDocumentsPartial({
  signature,
  officialFile,
}: PersonalDocumentsPartialProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [pendingDelete, setPendingDelete] = useState<
    'ine' | 'signature' | null
  >(null);

  const deleteMutation = useDeletePersonalDocument();
  const updateMutation = useUpdatePersonalDocument();

  const signatureId = (signature?.id ?? officialFile?.id) as string;
  const missingField: 'ine' | 'signature' = officialFile ? 'signature' : 'ine';

  function handleFileChange(file: File | null) {
    setPendingFile(file);
    setFileError(undefined);

    if (!file) return;

    const schema = missingField === 'ine' ? ineFileSchema : signatureFileSchema;
    const result = schema.safeParse(file);
    if (!result.success) {
      setFileError(result.error.issues[0]?.message);
    }
  }

  function handleSave() {
    if (!pendingFile || fileError) return;
    updateMutation.mutate(
      { signatureId, field: missingField, file: pendingFile },
      { onSuccess: () => setPendingFile(null) },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { signatureId, field: pendingDelete },
      { onSuccess: () => setPendingDelete(null) },
    );
  }

  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Documentos personales incompletos</CardTitle>
        <CardDescription>
          Falta{' '}
          {missingField === 'ine'
            ? 'tu identificación (INE)'
            : 'tu firma digital'}{' '}
          para completar tu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {officialFile && (
          <DocumentPreviewItem
            label="Identificación (INE)"
            secureUrl={officialFile.secureUrl}
            deleting={deleteMutation.isPending}
            onDelete={() => setPendingDelete('ine')}
          />
        )}

        {signature && (
          <DocumentPreviewItem
            label="Firma digital"
            secureUrl={signature.secureUrl}
            deleting={deleteMutation.isPending}
            onDelete={() => setPendingDelete('signature')}
          />
        )}

        <DocumentDropzone
          id={missingField === 'ine' ? 'ineFile' : 'signatureFile'}
          label={
            missingField === 'ine' ? 'Identificación (INE)' : 'Firma digital'
          }
          hint={
            missingField === 'ine'
              ? 'PDF, JPG o PNG. Máximo 5MB.'
              : 'Formato PNG. Máximo 5MB.'
          }
          accept={
            missingField === 'ine'
              ? 'application/pdf,image/jpeg,image/png'
              : 'image/png'
          }
          file={pendingFile}
          error={fileError}
          onFileChange={handleFileChange}
        />

        <Button
          type="button"
          className="w-full"
          disabled={
            !pendingFile || Boolean(fileError) || updateMutation.isPending
          }
          onClick={handleSave}
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </CardContent>

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        label={
          pendingDelete === 'ine' ? 'tu identificación (INE)' : 'tu firma digital'
        }
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        confirming={deleteMutation.isPending}
      />
    </Card>
  );
}
