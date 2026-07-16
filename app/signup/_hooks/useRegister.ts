'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { registerRequest } from '../_requests';
import type { RegisterFormValues } from '../_schemas';

export function getRegisterErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al crear tu cuenta. Intenta de nuevo.'
  );
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: RegisterFormValues) => registerRequest(values),
    onSuccess: () => {
      toast.success('Cuenta creada correctamente');
      router.push('/login?registered=1');
    },
    onError: (error) => {
      toast.error(getRegisterErrorMessage(error));
    },
  });
}
