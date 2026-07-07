'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../auth';

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSettled: () => router.push('/login'),
  });
}
