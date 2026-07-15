'use client';

import { useMutation } from '@tanstack/react-query';
import { createCheckoutSessionRequest } from '@/lib/api/plans/plans.requests';

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: createCheckoutSessionRequest,
    onSuccess: (session) => {
      window.location.href = session.url;
    },
  });
}
