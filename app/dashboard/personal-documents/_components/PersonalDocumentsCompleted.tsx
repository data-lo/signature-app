'use client';

/**
 * SIN USO desde que "Identidad y firma" pasó al flujo con Didit.
 *
 * Su único consumidor era `IdentitySignatureView`, que ahora dibuja la pantalla a partir de
 * `users.signing_credential_status` con dos tarjetas propias (`DiditVerificationCard` y
 * `SignatureCard`). No hay ninguna ruta que monte este componente.
 *
 * Se conserva a propósito y no se borró junto con el cambio: muestra la INE junto con la firma,
 * una combinación que la pantalla nueva ya no representa.
 *
 * Si se decide que la INE queda exclusivamente en manos de Didit, este archivo —junto con los
 * otros marcados igual y sus hooks exclusivos— se puede eliminar completo. Mientras tanto, NO
 * agregarle funcionalidad: cualquier regla nueva sobre identidad o firma va en el flujo de
 * `identity/`, que es el que sí está conectado y el único que respeta la máquina de estados
 * del backend (el endpoint de alta responde 403 salvo en SIGNATURE_PENDING).
 */

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
