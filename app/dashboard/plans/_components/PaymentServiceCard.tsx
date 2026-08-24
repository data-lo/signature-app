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
import { Button } from '@/components/ui/button';
import { formatAmount, formatInterval } from '../_config/payment-services';
import type { PaymentService } from '../_interfaces/payment-service.interface';

interface PaymentServiceCardProps {
  service: PaymentService;
  /** `true` sólo en la tarjeta cuya compra se está abriendo. */
  isSubmitting: boolean;
  /** `true` mientras cualquier compra está en curso: evita abrir dos sesiones a la vez. */
  isAnySubmitting: boolean;
  onBuy: (priceId: string) => void;
}

export default function PaymentServiceCard({
  service,
  isSubmitting,
  isAnySubmitting,
  onBuy,
}: PaymentServiceCardProps) {
  const interval = formatInterval(service.interval, service.intervalCount);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
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
        <Button
          type="button"
          variant="brand"
          className="w-full"
          /**
           * Se deshabilitan todas las tarjetas mientras una compra está en curso: el navegador
           * ya está por irse a Stripe, y un segundo clic abriría otra sesión que nadie va a
           * usar y que igual se cobra como llamada al proveedor.
           */
          disabled={isAnySubmitting}
          onClick={() => onBuy(service.priceId)}
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
      </CardFooter>
    </Card>
  );
}
