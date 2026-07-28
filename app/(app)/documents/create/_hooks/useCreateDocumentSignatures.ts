'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createDocumentSignaturesRequest } from '../_requests';
import {
  computeRequiresDifferentSignatures,
  toBackendCollaboratorPayload,
  type CollaboratorFormValues,
} from '../_schemas';
import { getErrorMessage } from '@/lib/error-handler';

interface CreateDocumentSignaturesParams {
  file: File;
  fileName: string;
  requiresApproval: boolean;
  collaborators: CollaboratorFormValues[];
}

/**
 * Escenario 4 de la historia: tras un envío exitoso, `mutate` invalida `myDocuments` (la tabla
 * se refresca sola por el refetch de React Query) — la limpieza del formulario/FilePond
 * (`form.reset()`) la maneja el caller en `onSuccess`, porque solo el componente tiene la
 * instancia del form de react-hook-form y el estado del File de FilePond.
 */
export function useCreateDocumentSignatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      fileName,
      requiresApproval,
      collaborators,
    }: CreateDocumentSignaturesParams) => {
      const payload = collaborators.map(toBackendCollaboratorPayload);
      const requiresDifferentSignatures =
        computeRequiresDifferentSignatures(collaborators);

      return createDocumentSignaturesRequest(
        file,
        { fileName, requiresApproval },
        payload,
        requiresDifferentSignatures,
      );
    },
    onSuccess: () => {
      toast.success('Documento enviado a firma correctamente');
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.',
        ),
      );
    },
  });
}
