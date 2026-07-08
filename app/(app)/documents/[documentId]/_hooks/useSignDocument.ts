'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { signDocumentRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? 'Ocurrió un error al firmar el documento. Intenta de nuevo.';
}

export function useSignDocument(documentId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => signDocumentRequest(documentId),
    onSuccess: () => {
      toast.success('Documento firmado correctamente');
      queryClient.invalidateQueries({ queryKey: ['documentDetail', documentId] });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push('/documents');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
