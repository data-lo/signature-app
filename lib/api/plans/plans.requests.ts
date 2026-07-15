import apiClient from '@/lib/axios';
import { Plan, PlanId } from './plan.interface';
import { CheckoutSessionResponse } from './checkout-session-response.interface';
import { UserSubscriptionState } from './user-subscription-state.interface';

export async function getPlansRequest(): Promise<Plan[]> {
  const { data } = await apiClient.get<{ success: boolean; message: string; data: Plan[] }>(
    '/stripe/plans',
  );
  return data.data;
}

export async function createCheckoutSessionRequest(planId: PlanId): Promise<CheckoutSessionResponse> {
  const { data } = await apiClient.post<{ success: boolean; message: string; data: CheckoutSessionResponse }>(
    '/stripe/checkout/session',
    { planId },
  );
  return data.data;
}

export async function getSubscriptionStateRequest(): Promise<UserSubscriptionState> {
  const { data } = await apiClient.get<{ success: boolean; message: string; data: UserSubscriptionState }>(
    '/stripe/subscription',
  );
  return data.data;
}
