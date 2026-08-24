/** Espejo de `UserSubscriptionState` en signature-server. */
export type SubscriptionStatus =
  | 'incomplete'
  | 'active'
  | 'past_due'
  | 'canceled';

export interface SubscriptionState {
  hasActiveSubscription: boolean;
  planId: string | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}
