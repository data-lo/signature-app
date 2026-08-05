'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createCheckoutSessionRequest } from '@/lib/api/plans/plans.requests';
import { getErrorMessage } from '@/lib/error-handler';

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: createCheckoutSessionRequest,
    onSuccess: (session) => {
      window.location.href = session.url;
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'No se pudo iniciar el proceso de pago. Intenta de nuevo.',
        ),
      );
    },
  });
}
