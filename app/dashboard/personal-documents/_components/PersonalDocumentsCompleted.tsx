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
