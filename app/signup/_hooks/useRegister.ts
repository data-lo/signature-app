'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { registerRequest } from '../_requests';
import type { RegisterFormValues } from '../_schemas';

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: RegisterFormValues) => registerRequest(values),
    onSuccess: () => {
      router.push('/login?registered=1');
    },
  });
}
