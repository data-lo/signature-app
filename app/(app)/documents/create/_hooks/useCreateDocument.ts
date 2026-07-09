'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  createDocumentRequest,
  submitForAuthorizationRequest,
} from '../_requests';

interface CreateDocumentParams {
  file: File;
  signerIds: string[];
  spectatorIds: string[];
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al enviar el documento a firma. Intenta de nuevo.'
  );
}

export function useCreateDocument() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      signerIds,
      spectatorIds,
    }: CreateDocumentParams) => {
      const { id } = await createDocumentRequest(file, signerIds, spectatorIds);
      await submitForAuthorizationRequest(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Documento enviado a firma correctamente');
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push('/documents');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
