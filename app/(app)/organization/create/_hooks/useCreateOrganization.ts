'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { createOrganizationRequest } from '@/lib/api/accounts';
import { useAccountStore } from '@/lib/store/useAccountStore';

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    'Ocurrió un error al crear la organización. Intenta de nuevo.'
  );
}

export function useCreateOrganization() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveAccount = useAccountStore((state) => state.setActiveAccount);

  return useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: (account) => {
      setActiveAccount(account);
      queryClient.invalidateQueries({ queryKey: ['accountsCatalog'] });
      toast.success(
        'Puedes alternar entre tu cuenta personal y la de la organización',
      );
      router.push('/home');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
