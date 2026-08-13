'use client';

import { useState } from 'react';
import type { CurrentUser } from '@/lib/api/auth';
import {
  INE_DOCUMENT,
  SIGNATURE_DOCUMENT,
  getPersonalDocumentConfig,
  type PersonalDocumentField,
} from '../_config/personal-documents.config';
import { useDeletePersonalDocument } from '../_hooks/useDeletePersonalDocument';
import PersonalDocumentCard from './PersonalDocumentCard';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface PersonalDocumentsCompletedProps {
  signature: NonNullable<CurrentUser['signature']>;
  officialFile: NonNullable<CurrentUser['officialFile']>;
}

export default function PersonalDocumentsCompleted({
  signature,
  officialFile,
}: PersonalDocumentsCompletedProps) {
  const [pendingDelete, setPendingDelete] =
    useState<PersonalDocumentField | null>(null);
  const deleteMutation = useDeletePersonalDocument();

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { signatureId: signature.id, field: pendingDelete },
      { onSuccess: () => setPendingDelete(null) },
    );
  }

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
        <PersonalDocumentCard
          config={INE_DOCUMENT}
          storedUrl={officialFile.secureUrl}
          onDelete={() => setPendingDelete('ine')}
          deleting={deleteMutation.isPending}
        />

        <PersonalDocumentCard
          config={SIGNATURE_DOCUMENT}
          storedUrl={signature.secureUrl}
          onDelete={() => setPendingDelete('signature')}
          deleting={deleteMutation.isPending}
        />
      </div>

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
    </>
  );
}
