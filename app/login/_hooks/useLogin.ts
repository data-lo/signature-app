'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/cookies';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';
import { useAccountStore } from '@/lib/store/useAccountStore';

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (data) => {
      setAuthToken(data.token);
      useAccountStore.getState().hydrateToken();
      router.push('/home');
    },
  });
}
