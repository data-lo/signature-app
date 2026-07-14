'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../auth';
import { useAccountStore } from '@/lib/store/useAccountStore';

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAccountStore.getState().clear();
      router.push('/login');
    },
  });
}
