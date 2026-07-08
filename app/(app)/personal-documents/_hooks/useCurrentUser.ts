'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUserRequest } from '../_requests';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUserRequest,
  });
}
