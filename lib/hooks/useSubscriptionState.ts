'use client';

import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStateRequest } from '@/lib/api/plans/plans.requests';

export function useSubscriptionState() {
  return useQuery({
    queryKey: ['subscriptionState'],
    queryFn: getSubscriptionStateRequest,
  });
}
