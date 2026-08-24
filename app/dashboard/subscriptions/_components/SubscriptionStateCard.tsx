'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptionState } from '../_hooks/useSubscriptionState';
import type { SubscriptionStatus } from '../_interfaces/subscription-state.interface';

/** El estado del proveedor, rotulado para el usuario. */
const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  incomplete: 'Pendiente de confirmación',
  active: 'Activa',
  past_due: 'Con un pago pendiente',
  canceled: 'Cancelada',
};

/**
 * Estado actual de la suscripción de la cuenta.
 *
 * Se lee del backend y no de la URL de retorno: es la única fuente que refleja lo que el
 * webhook ya confirmó. Justo después de pagar puede seguir diciendo "pendiente" durante unos
 * segundos, y eso es correcto — el aviso de arriba explica esa espera.
 */
export default function SubscriptionStateCard() {
  const { data: subscription, isPending, isError } = useSubscriptionState();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando tu suscripción...
      </div>
    );
  }

  if (isError || !subscription) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el estado de tu suscripción. Intenta de nuevo más
        tarde.
      </p>
    );
  }

  if (!subscription.status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin suscripción activa</CardTitle>
          <CardDescription>
            Todavía no has contratado ningún servicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard/plans" />} variant="brand">
            Ver planes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STATUS_LABELS[subscription.status]}</CardTitle>
        <CardDescription>
          {subscription.hasActiveSubscription
            ? 'Tu suscripción está al corriente y puedes firmar documentos.'
            : 'Tu suscripción todavía no habilita la firma de documentos.'}
        </CardDescription>
      </CardHeader>

      {subscription.currentPeriodEnd ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Periodo vigente hasta{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString(
              'es-MX',
              { dateStyle: 'long' },
            )}
            .
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
