'use client';

import { usePlans } from '@/lib/hooks/usePlans';
import { useSubscriptionState } from '@/lib/hooks/useSubscriptionState';
import { useCreateCheckoutSession } from '@/lib/hooks/useCreateCheckoutSession';
import { PlanId } from '@/lib/api/plans/plan.interface';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { PLANS_COPY } from './_config/plans-copy.config';
import PlanCard from './_components/PlanCard';

export default function PlansPage() {
  const { data: plans, isLoading: isLoadingPlans } = usePlans();
  const { data: subscriptionState } = useSubscriptionState();
  const createCheckoutSession = useCreateCheckoutSession();

  function handleSubscribe(planId: PlanId) {
    createCheckoutSession.mutate(planId);
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-medium text-foreground">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Elige el plan que mejor se ajuste a tus necesidades de firma de documentos.
        </p>
      </div>

      {isLoadingPlans && <p className="text-sm text-muted-foreground">Cargando planes...</p>}

      {plans && (
        <div className="flex flex-col gap-4 md:flex-row">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              copy={PLANS_COPY[plan.id]}
              isCurrentPlan={subscriptionState?.hasActiveSubscription === true && subscriptionState.planId === plan.id}
              isSubmitting={createCheckoutSession.isPending}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
