'use client';

import { Check } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plan } from '@/lib/api/plans/plan.interface';
import { PlanCopy } from '../_config/plans-copy.config';

interface PlanCardProps {
  plan: Plan;
  copy: PlanCopy;
  isCurrentPlan: boolean;
  isSubmitting: boolean;
  onSubscribe: (planId: Plan['id']) => void;
}

export default function PlanCard({ plan, copy, isCurrentPlan, isSubmitting, onSubscribe }: PlanCardProps) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {copy.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant="brand"
          className="w-full"
          disabled={isCurrentPlan || isSubmitting}
          onClick={() => onSubscribe(plan.id)}
        >
          {isCurrentPlan ? 'Plan actual' : isSubmitting ? 'Redirigiendo...' : 'Suscribirse'}
        </Button>
      </CardFooter>
    </Card>
  );
}
