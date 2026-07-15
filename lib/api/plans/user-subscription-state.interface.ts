import { PlanId } from './plan.interface';

export type SubscriptionStatus = 'incomplete' | 'active' | 'past_due' | 'canceled';

export interface UserSubscriptionState {
  hasActiveSubscription: boolean;
  planId: PlanId | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}
