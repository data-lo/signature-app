'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { createDocumentSignaturesRequest } from '../_requests';
import {
  computeRequiresDifferentSignatures,
  toCollaboratorPayloads,
} from '../_mappers/collaborator-payload.mapper';
import type { CreateDocumentSignaturesInput } from '../_interfaces/create-document-signatures-request.interface';

export const CREATE_DOCUMENT_ERROR_MESSAGE =
  'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.';

/**
 * Escenario 4 de la historia: tras un envío exitoso, `mutate` invalida `myDocuments` (la tabla
 * se refresca sola por el refetch de React Query) — la limpieza del formulario y del widget de
 * carga la maneja el caller en `onSuccess` (ver `useCreateDocumentForm`), porque solo él tiene
 * la instancia del formulario y el estado del archivo.
 *
 * La traducción de los valores del formulario al payload del backend vive en `_mappers/`: aquí
 * solo se orquesta la mutación y sus efectos (aviso de error, invalidación de caché).
 *
 * La confirmación de éxito NO se emite aquí: dejó de ser un toast y pasó a ser un AlertDialog que
 * el usuario tiene que reconocer (ver `DocumentSentDialog`), porque incluye información que debe
 * poder leer con calma —el aviso por correo y dónde seguir el estado— y un toast se desvanece
 * solo. Lo abre la pantalla desde `onSubmitted`, que es quien puede renderizarlo.
 */
export function useCreateDocumentSignatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      fileName,
      requiresApproval,
      requiresOrder,
      collaborators,
    }: CreateDocumentSignaturesInput) =>
      createDocumentSignaturesRequest({
        file,
        documentData: { fileName, requiresApproval, isSequential: requiresOrder },
        collaborators: toCollaboratorPayloads(collaborators),
        requiresDifferentSignatures:
          computeRequiresDifferentSignatures(collaborators),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, CREATE_DOCUMENT_ERROR_MESSAGE));
    },
  });
}
