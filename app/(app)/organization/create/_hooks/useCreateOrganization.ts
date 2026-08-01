'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { createOrganizationRequest } from '@/lib/api/accounts';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { toAccountListEntry } from '@/lib/store/accounts-list.slice';

export function useCreateOrganization() {
  const router = useRouter();
  const addAccount = useAuthStore((state) => state.addAccount);
  const setActiveAccount = useAuthStore((state) => state.setActiveAccount);

  return useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: (account) => {
      // Regla B: se inserta en accountsList y se activa el nuevo tenant sin
      // invocar una petición extra a la red (nada de invalidateQueries aquí).
      addAccount(account);
      setActiveAccount(toAccountListEntry(account));
      toast.success(
        'Puedes alternar entre tu cuenta personal y la de la organización',
      );
      router.push('/documents/create');
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Ocurrió un error al crear la organización. Intenta de nuevo.',
        ),
      );
    },
  });
}
