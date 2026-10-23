'use client';

import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { checkRfcRequest } from '@/lib/api/users';
import { logSafeError } from '@/lib/observability/safe-log';

export function useCheckRfc() {
  return useMutation({
    mutationFn: (rfc: string) => checkRfcRequest(rfc),
    onError: (error) => {
      logSafeError('[join] falló consultar el RFC', error);
      toast.error('Ocurrió un error al validar tu RFC. Intenta de nuevo.');
    },
  });
}
