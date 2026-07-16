'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../auth';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().logout();
      router.push('/login');
    },
  });
}
