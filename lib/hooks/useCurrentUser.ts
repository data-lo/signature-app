'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUserRequest } from '@/lib/api/auth';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUserRequest,
  });
}
