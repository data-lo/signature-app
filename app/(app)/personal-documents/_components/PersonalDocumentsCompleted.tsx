'use client';

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

interface PersonalDocumentsCompletedProps {
  signature: NonNullable<CurrentUser['signature']>;
  officialFile: NonNullable<CurrentUser['officialFile']>;
}

export default function PersonalDocumentsCompleted({
  signature,
  officialFile,
}: PersonalDocumentsCompletedProps) {
  const deleteMutation = useDeletePersonalDocument();

  function handleDelete(field: 'ine' | 'signature') {
    const label =
      field === 'ine' ? 'tu identificación (INE)' : 'tu firma digital';
    if (
      !window.confirm(
        `¿Seguro que quieres eliminar ${label}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate({ signatureId: signature.id, field });
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
          onDelete={() => handleDelete('ine')}
        />

        <DocumentPreviewItem
          label="Firma digital"
          secureUrl={signature.secureUrl}
          deleting={deleteMutation.isPending}
          onDelete={() => handleDelete('signature')}
        />
      </CardContent>
    </Card>
  );
}
