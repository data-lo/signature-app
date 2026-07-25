'use client';

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getDocumentFileUrlRequest } from '../_requests';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al descargar el documento. Intenta de nuevo.'
  );
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (documentId: string) => getDocumentFileUrlRequest(documentId),
    onSuccess: ({ secureUrl }) => {
      window.open(secureUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
