'use client';

import { useQuery } from '@tanstack/react-query';
import { getPlansRequest } from '@/lib/api/plans/plans.requests';

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: getPlansRequest,
  });
}
