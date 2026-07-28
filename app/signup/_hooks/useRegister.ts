'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { registerRequest, type RegisterRequestValues } from '../_requests';
import { getErrorMessage } from '@/lib/error-handler';

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
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear tu cuenta. Intenta de nuevo.',
        ),
      );
    },
  });
}
