'use client';

import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import PersonalDocumentsCompleted from '../../_components/PersonalDocumentsCompleted';
import PersonalDocumentsPartial from '../../_components/PersonalDocumentsPartial';
import PersonalDocumentsForm from '../../_components/PersonalDocumentsForm';

export default function IdentitySignatureView() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando tu información...
      </div>
    );
  }

  if (isError || !user) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar tu información. Intenta de nuevo más tarde.
      </p>
    );
  }

  return (
    <div id="signature-documents" className="flex w-full flex-col items-center gap-6">
      {user.signature && user.officialFile ? (
        <PersonalDocumentsCompleted
          signature={user.signature}
          officialFile={user.officialFile}
        />
      ) : user.signature || user.officialFile ? (
        <PersonalDocumentsPartial
          signature={user.signature ?? null}
          officialFile={user.officialFile ?? null}
        />
      ) : (
        <PersonalDocumentsForm />
      )}
    </div>
  );
}
