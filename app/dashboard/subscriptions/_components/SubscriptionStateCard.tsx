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
import type { BillingProfileStatus } from '../_interfaces/subscription-state.interface';

/** El estado del perfil de facturación, rotulado para el usuario. */
const STATUS_LABELS: Record<BillingProfileStatus, string> = {
  FREE: 'Plan gratuito',
  INCOMPLETE: 'Pendiente de confirmación',
  ACTIVE: 'Activa',
  PAST_DUE: 'Con un pago pendiente',
  CANCELED: 'Cancelada',
};

/**
 * El plan viene del catálogo del backend, que es un conjunto abierto: se rotula capitalizando en
 * vez de traducirlo con un mapa, para que dar de alta un plan nuevo no obligue a desplegar esta
 * app ni deje la tarjeta en blanco mientras tanto.
 */
function planLabel(planType: string): string {
  return planType.charAt(0).toUpperCase() + planType.slice(1);
}

/**
 * Estado actual de la suscripción de la CUENTA ACTIVA.
 *
 * Se lee del backend y no de la URL de retorno: es la única fuente que refleja lo que el webhook
 * ya confirmó. Justo después de pagar puede seguir diciendo "pendiente" durante unos segundos, y
 * eso es correcto — el aviso de arriba explica esa espera.
 *
 * Muestra el estado de la cuenta en la que se está trabajando, no el del usuario: quien tiene
 * cuenta personal y organización ve uno u otro según el switcher, y cambiar de cuenta redibuja
 * esta tarjeta sola porque la cuenta va en la `queryKey`.
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

  /**
   * El plan gratuito va antes del bloque general y no puede caer en él: comparte
   * `hasActiveSubscription: false` con un plan de pago caducado, pero significan lo contrario.
   * Éste es el plan CON EL QUE LA CUENTA NACE y está perfectamente vigente — sólo que no es de
   * pago. Decirle a quien acaba de registrarse que su plan "todavía no habilita" nada sería
   * cierto a medias y alarmante del todo.
   */
  if (subscription.status === 'FREE') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Gratuito</CardTitle>
          <CardDescription>
            Es el plan con el que empieza toda cuenta. Contrata un plan cuando
            necesites más de lo que incluye.
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
        <CardTitle>
          {subscription.planType
            ? `Plan ${planLabel(subscription.planType)} — ${STATUS_LABELS[subscription.status]}`
            : STATUS_LABELS[subscription.status]}
        </CardTitle>
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
