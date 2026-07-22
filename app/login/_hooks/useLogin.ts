'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { setAuthToken } from '@/lib/cookies';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';

export function getLoginErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ?? 'Error de conexión con el servidor'
  );
}

export function useLogin() {
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (data) => {
      setAuthToken(data.token);
      
      window.location.href = '/home';
    },
    onError: (error) => {
      console.error('[login] falló el inicio de sesión:', error);
      toast.error(getLoginErrorMessage(error));
    },
  });
}