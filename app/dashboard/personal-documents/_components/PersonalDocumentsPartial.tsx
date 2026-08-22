'use client';

/**
 * SIN USO desde que "Identidad y firma" pasó al flujo con Didit.
 *
 * Su único consumidor era `IdentitySignatureView`, que ahora dibuja la pantalla a partir de
 * `users.signing_credential_status` con dos tarjetas propias (`DiditVerificationCard` y
 * `SignatureCard`). No hay ninguna ruta que monte este componente.
 *
 * Se conserva a propósito y no se borró junto con el cambio: cubre el caso mixto (uno de los dos
 * archivos presente), que sólo existe si se sigue permitiendo subir la INE por separado.
 *
 * Si se decide que la INE queda exclusivamente en manos de Didit, este archivo —junto con los
 * otros marcados igual y sus hooks exclusivos— se puede eliminar completo. Mientras tanto, NO
 * agregarle funcionalidad: cualquier regla nueva sobre identidad o firma va en el flujo de
 * `identity/`, que es el que sí está conectado y el único que respeta la máquina de estados
 * del backend (el endpoint de alta responde 403 salvo en SIGNATURE_PENDING).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CurrentUser } from '@/lib/api/auth';
import { ineFileSchema, signatureFileSchema } from '../_schemas';
import {
  INE_DOCUMENT,
  SIGNATURE_DOCUMENT,
  getPersonalDocumentConfig,
  type PersonalDocumentField,
} from '../_config/personal-documents.config';
import { useDeletePersonalDocument } from '../_hooks/useDeletePersonalDocument';
import { useUpdatePersonalDocument } from '../_hooks/useUpdatePersonalDocument';
import PersonalDocumentCard from './PersonalDocumentCard';
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
  const [pendingDelete, setPendingDelete] =
    useState<PersonalDocumentField | null>(null);

  const deleteMutation = useDeletePersonalDocument();
  const updateMutation = useUpdatePersonalDocument();

  const signatureId = (signature?.id ?? officialFile?.id) as string;
  const missingField: PersonalDocumentField = officialFile
    ? 'signature'
    : 'ine';

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

  /** Props del documento que falta: dropzone activo y sin acción de eliminar. */
  function missingDocumentProps(field: PersonalDocumentField) {
    return {
      storedUrl: null,
      pendingFile,
      error: fileError,
      onFileChange: handleFileChange,
      // La INE es opcional en el alta, así que también lo es cuando es la que falta.
      optional: field === 'ine',
    };
  }

  /** Props del documento ya guardado: solo previsualización y eliminar. */
  function storedDocumentProps(field: PersonalDocumentField, url: string) {
    return {
      storedUrl: url,
      onDelete: () => setPendingDelete(field),
      deleting: deleteMutation.isPending,
    };
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PersonalDocumentCard
          config={INE_DOCUMENT}
          {...(officialFile
            ? storedDocumentProps('ine', officialFile.secureUrl)
            : missingDocumentProps('ine'))}
        />

        <PersonalDocumentCard
          config={SIGNATURE_DOCUMENT}
          {...(signature
            ? storedDocumentProps('signature', signature.secureUrl)
            : missingDocumentProps('signature'))}
        />
      </div>

      <Button
        type="button"
        className="w-full sm:w-auto sm:self-start"
        disabled={
          !pendingFile || Boolean(fileError) || updateMutation.isPending
        }
        onClick={handleSave}
      >
        {updateMutation.isPending
          ? 'Guardando...'
          : `Guardar ${getPersonalDocumentConfig(missingField).possessiveName}`}
      </Button>

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        label={
          pendingDelete
            ? getPersonalDocumentConfig(pendingDelete).possessiveName
            : ''
        }
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        confirming={deleteMutation.isPending}
      />
    </div>
  );
}
