'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { rejectDocumentRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? 'Ocurrió un error al rechazar el documento. Intenta de nuevo.';
}

export function useRejectDocument(documentId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => rejectDocumentRequest(documentId, reason),
    onSuccess: () => {
      toast.success('Documento rechazado correctamente');
      queryClient.invalidateQueries({ queryKey: ['documentDetail', documentId] });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
      router.push('/documents');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
