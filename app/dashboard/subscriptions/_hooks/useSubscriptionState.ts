'use client';

import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStateRequest } from '../_requests';

export const SUBSCRIPTION_STATE_QUERY_KEY = ['subscriptionState'];

export function useSubscriptionState() {
  return useQuery({
    queryKey: SUBSCRIPTION_STATE_QUERY_KEY,
    queryFn: getSubscriptionStateRequest,
  });
}
