'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/cookies';
import { loginRequest } from '../_requests';
import type { LoginFormValues } from '../_schemas';

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (data) => {
      setAuthToken(data.token);
      router.push('/home');
    },// Agregar un OnError handler para mostrar un mensaje de error al usuario en caso de que la petición falle, por ejemplo, usando un toast o un modal.
  });
}
