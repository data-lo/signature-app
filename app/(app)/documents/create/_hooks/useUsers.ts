'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsersRequest } from '../_requests';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsersRequest,
  });
}
