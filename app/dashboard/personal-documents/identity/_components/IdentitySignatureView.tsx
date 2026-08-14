'use client';

import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import {
  INE_DOCUMENT,
  SIGNATURE_DOCUMENT,
} from '../../_config/personal-documents.config';
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

  const hasIne = Boolean(user.officialFile);
  const hasSignature = Boolean(user.signature);

  // El estado de la sección se decide una sola vez aquí (y no dentro de cada vista) para que el
  // encabezado y el contenido no puedan describir situaciones distintas.
  const description =
    hasIne && hasSignature
      ? `Ya registraste ${INE_DOCUMENT.possessiveName} y ${SIGNATURE_DOCUMENT.possessiveName}.`
      : hasIne || hasSignature
        ? `Falta ${hasIne ? SIGNATURE_DOCUMENT.possessiveName : INE_DOCUMENT.possessiveName} para completar tu perfil.`
        : `Sube ${SIGNATURE_DOCUMENT.possessiveName} para completar tu perfil. La identificación oficial (INE) es opcional y puedes agregarla después.`;

  return (
    <div id="signature-documents" className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-lg font-medium text-foreground">
          Identidad y firma
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {user.signature && user.officialFile ? (
        <PersonalDocumentsCompleted
          signature={user.signature}
          officialFile={user.officialFile}
        />
      ) : hasIne || hasSignature ? (
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
