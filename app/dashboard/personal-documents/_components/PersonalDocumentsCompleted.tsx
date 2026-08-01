'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CurrentUser } from '@/lib/api/auth';
import { useDeletePersonalDocument } from '../_hooks/useDeletePersonalDocument';
import DocumentPreviewItem from './DocumentPreviewItem';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface PersonalDocumentsCompletedProps {
  signature: NonNullable<CurrentUser['signature']>;
  officialFile: NonNullable<CurrentUser['officialFile']>;
}

export default function PersonalDocumentsCompleted({
  signature,
  officialFile,
}: PersonalDocumentsCompletedProps) {
  const [pendingDelete, setPendingDelete] = useState<
    'ine' | 'signature' | null
  >(null);
  const deleteMutation = useDeletePersonalDocument();

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { signatureId: signature.id, field: pendingDelete },
      { onSuccess: () => setPendingDelete(null) },
    );
  }

  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-500" />
          Documentos personales completos
        </CardTitle>
        <CardDescription>
          Ya registraste tu identificación oficial y tu firma digital.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DocumentPreviewItem
          label="Identificación (INE)"
          secureUrl={officialFile.secureUrl}
          deleting={deleteMutation.isPending}
          onDelete={() => setPendingDelete('ine')}
        />

        <DocumentPreviewItem
          label="Firma digital"
          secureUrl={signature.secureUrl}
          deleting={deleteMutation.isPending}
          onDelete={() => setPendingDelete('signature')}
        />
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
