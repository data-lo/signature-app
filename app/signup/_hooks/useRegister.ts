'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { registerRequest, type RegisterRequestValues } from '../_requests';

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
    mutationFn: (values: RegisterRequestValues) => registerRequest(values),
    onSuccess: () => {
      toast.success('Cuenta creada correctamente');
      router.push('/login?registered=1');
    },
    onError: (error) => {
      console.error('[register] falló la creación de cuenta:', error);
      toast.error(getRegisterErrorMessage(error));
    },
  });
}
