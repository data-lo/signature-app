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
import { useBillingState } from '@/lib/hooks/useBillingState';
import { FREE_PLAN_TYPE } from '@/lib/api/billing';

/**
 * El plan viene del catálogo del backend (`basic`, `plus`, ...), que es un conjunto abierto: se
 * rotula capitalizando en vez de traducirlo con un mapa, para que dar de alta un plan nuevo no
 * obligue a desplegar esta app ni deje la tarjeta en blanco mientras tanto.
 */
function planLabel(planType: string): string {
  return planType.charAt(0).toUpperCase() + planType.slice(1);
}

/**
 * Estado de la suscripción de la CUENTA ACTIVA.
 *
 * Se lee del backend y no de la URL de retorno: es la única fuente que refleja lo que el webhook
 * ya confirmó. Justo después de pagar puede seguir diciendo "sin suscripción" durante unos
 * segundos, y eso es correcto — el aviso de arriba explica esa espera y es quien insiste.
 *
 * Muestra el estado de la cuenta en la que el usuario está trabajando, no el del usuario: quien
 * tiene cuenta personal y organización ve uno u otro según el switcher, y cambiar de cuenta
 * redibuja esta tarjeta sola.
 */
export default function SubscriptionStateCard() {
  const { data: billing, isPending, isError } = useBillingState();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando tu suscripción...
      </div>
    );
  }

  if (isError || !billing) {
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar el estado de tu suscripción. Intenta de nuevo más
        tarde.
      </p>
    );
  }

  if (billing.hasActiveSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {billing.currentPlanType
              ? `Plan ${planLabel(billing.currentPlanType)}`
              : 'Suscripción activa'}
          </CardTitle>
          <CardDescription>
            Tu suscripción está al corriente y puedes firmar documentos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  /**
   * El plan gratuito va ANTES del bloque de abajo y no puede caer en él.
   *
   * Los dos llegan con `hasActiveSubscription: false`, pero significan cosas opuestas: aquél es
   * un plan de pago que dejó de estar vigente, y éste es el plan CON EL QUE LA CUENTA NACE, que
   * está perfectamente vigente — sólo que no es de pago. Tratarlos igual le diría a cualquiera
   * que acaba de registrarse que su plan "no está vigente", que es falso y además alarmante.
   */
  if (billing.currentPlanType === FREE_PLAN_TYPE) {
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

  /**
   * Un plan de pago sin suscripción vigente es el último que se contrató: el perfil quedó
   * `INCOMPLETE`, `PAST_DUE` o `CANCELED`. Se nombra —ayuda a reconocer de qué se está
   * hablando— pero el texto deja claro que hoy no habilita nada.
   */
  if (billing.currentPlanType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin suscripción activa</CardTitle>
          <CardDescription>
            Tu plan {planLabel(billing.currentPlanType)} no está vigente, así que
            todavía no habilita la firma de documentos.
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
