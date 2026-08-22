import apiClient from '@/lib/axios';
import type { SubscriptionState } from './_interfaces/subscription-state.interface';

export async function getSubscriptionStateRequest(): Promise<SubscriptionState> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: SubscriptionState;
  }>('/api/v1/payments/subscription');

  return data.data;
}
