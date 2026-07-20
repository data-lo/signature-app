'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { checkRfcRequest } from '@/lib/api/users';

export function useCheckRfc() {
  return useMutation({
    mutationFn: (rfc: string) => checkRfcRequest(rfc),
    onError: (error) => {
      console.error('[join] falló consultar el RFC:', error);
      toast.error('Ocurrió un error al validar tu RFC. Intenta de nuevo.');
    },
  });
}
