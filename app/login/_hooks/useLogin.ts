'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/cookies';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';

export function useLogin() {
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (data) => {
      setAuthToken(data.token);
      
      window.location.href = '/home';
    },
  });
}