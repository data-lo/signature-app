'use client';

import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatAmount, formatInterval } from '../_config/payment-services';
import type { PaymentService } from '../_interfaces/payment-service.interface';

/** Lo que se le dice a quien intenta contratar teniendo ya un plan. */
export const ACTIVE_SUBSCRIPTION_TOOLTIP = 'Tienes un plan activo';

interface PaymentServiceCardProps {
  service: PaymentService;
  /** `true` sólo en la tarjeta cuya compra se está abriendo. */
  isSubmitting: boolean;
  /** `true` mientras cualquier compra está en curso: evita abrir dos sesiones a la vez. */
  isAnySubmitting: boolean;
  /** El plan que la cuenta ya tiene contratado: lleva el badge y no se vuelve a ofrecer. */
  isCurrentPlan?: boolean;
  /**
   * La cuenta ya tiene una suscripción activa y este servicio es un plan. Deshabilita la
   * contratación y explica por qué. No aplica a las compras sueltas.
   */
  isBlockedByActiveSubscription?: boolean;
  onBuy: (priceId: string) => void;
}

export default function PaymentServiceCard({
  service,
  isSubmitting,
  isAnySubmitting,
  isCurrentPlan = false,
  isBlockedByActiveSubscription = false,
  onBuy,
}: PaymentServiceCardProps) {
  const interval = formatInterval(service.interval, service.intervalCount);

  const boton = (
    <Button
      type="button"
      variant="brand"
      /**
       * El bloqueo NO usa `disabled:opacity-50` de la variante porque no usa `disabled` (ver
       * abajo): se replica el atenuado sobre `aria-disabled` para que un botón que no se puede
       * pulsar tampoco parezca pulsable. Se omite `pointer-events-none` a propósito — es lo que
       * mataría el hover del que depende el tooltip.
       */
      className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      /**
       * Se deshabilitan todas las tarjetas mientras una compra está en curso: el navegador
       * ya está por irse a Stripe, y un segundo clic abriría otra sesión que nadie va a
       * usar y que igual se cobra como llamada al proveedor.
       */
      disabled={isAnySubmitting}
      /**
       * El bloqueo por suscripción activa va en `aria-disabled` y NO en `disabled`, y la
       * diferencia es justamente el tooltip: un botón `disabled` no recibe eventos de puntero ni
       * foco, así que la explicación de por qué no se puede pulsar no se mostraría nunca — el
       * usuario se quedaría con un botón muerto y sin motivo. Así sigue enfocable y anunciado
       * como no disponible, y el clic se corta abajo.
       */
      aria-disabled={isBlockedByActiveSubscription || undefined}
      onClick={() => {
        if (isBlockedByActiveSubscription) {
          return;
        }
        onBuy(service.priceId);
      }}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Redirigiendo a Stripe...
        </>
      ) : (
        'Comprar'
      )}
    </Button>
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{service.name}</CardTitle>
          {isCurrentPlan ? <Badge variant="success">Plan actual</Badge> : null}
        </div>
        {service.description ? (
          <CardDescription>{service.description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={service.name}
            className="h-32 w-full rounded border border-input bg-muted object-contain"
          />
        ) : null}

        <p className="flex items-baseline gap-1.5">
          <span className="font-heading text-2xl font-medium text-foreground">
            {formatAmount(service.unitAmount, service.currency)}
          </span>
          {interval ? (
            <span className="text-sm text-muted-foreground">{interval}</span>
          ) : null}
        </p>
      </CardContent>

      <CardFooter>
        {isBlockedByActiveSubscription ? (
          <Tooltip>
            <TooltipTrigger
              /**
               * El envoltorio ocupa el ancho de la tarjeta porque el botón es `w-full`: sin esto
               * el área que dispara el tooltip sería más angosta que el botón que explica, y
               * habría una franja donde pulsar no hace nada y tampoco dice por qué.
               */
              className="w-full"
              render={boton}
            />
            <TooltipContent>{ACTIVE_SUBSCRIPTION_TOOLTIP}</TooltipContent>
          </Tooltip>
        ) : (
          boton
        )}
      </CardFooter>
    </Card>
  );
}
