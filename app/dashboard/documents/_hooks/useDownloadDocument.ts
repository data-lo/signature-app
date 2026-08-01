'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { getDocumentFileUrlRequest } from '../_requests';

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (documentId: string) => getDocumentFileUrlRequest(documentId),
    onSuccess: ({ secureUrl }) => {
      window.open(secureUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al descargar el documento. Intenta de nuevo.',
        ),
      );
    },
  });
}
