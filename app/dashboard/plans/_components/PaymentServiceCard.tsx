'use client';

import { useId } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Card, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatAmount,
  formatInterval,
  formatPlanCadence,
} from '../_config/payment-services';
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

/**
 * Sección "Incluye": los beneficios del plan, uno por renglón y en el orden recibido del backend.
 *
 * Todo sale de `descriptions`; aquí no se escribe ningún beneficio. Es una lista semántica
 * (`<ul>` + un `<li>` por beneficio) rotulada por su encabezado, para que el lector de pantalla
 * anuncie "Incluye, lista, 5 elementos". El ícono es decorativo (`aria-hidden`).
 *
 * Con la lista vacía o ausente no se pinta nada: un "Incluye" sin elementos sólo hace ruido.
 *
 * @param props.descriptions - Beneficios del plan.
 * @param props.headingId - Id único del encabezado "Incluye", para rotular la lista.
 * @returns La sección de beneficios, o nada.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <PlanDescriptions headingId="plus-includes" descriptions={['Hasta 10 documentos']} />
 * ```
 */
export function PlanDescriptions({
  descriptions,
  headingId,
}: {
  descriptions?: readonly string[];
  headingId: string;
}) {
  if (!descriptions?.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <h3
        id={headingId}
        className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
      >
        Incluye
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-col gap-3 text-sm">
        {descriptions.map((description, index) => (
          // El backend garantiza que no hay repetidos; el índice conserva la identidad si se
          // reordena la lista.
          <li
            key={`${index}-${description}`}
            className="flex items-start gap-3 text-foreground"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-foreground"
              aria-hidden
            />
            <span>{description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
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
  const { can } = usePermissions();
  const headingId = useId();

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
      ) : service.interval ? (
        'Comprar plan'
      ) : (
        'Comprar'
      )}
    </Button>
  );

  /**
   * Cuatro bloques, siempre los cuatro y en este orden: encabezado, precio, "Incluye" y compra.
   * La tarjeta es un `subgrid` de 4 filas del grid del catálogo (ver `PaymentServicesView`), así
   * que cada bloque mide lo que el más alto de su fila entre todas las tarjetas: el precio y el
   * botón quedan a la misma altura aunque un plan tenga una descripción más larga o más
   * beneficios. Por eso un bloque vacío se pinta igual, como contenedor sin contenido.
   */
  return (
    <Card
      data-testid="payment-service-card"
      className="row-span-4 grid grid-rows-subgrid gap-0 py-0"
    >
      <header className="flex flex-col gap-3 px-8 pt-8">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium tracking-wider text-primary uppercase">
            {formatPlanCadence(service.interval, service.intervalCount)}
          </p>
          {isCurrentPlan ? <Badge variant="success">Plan actual</Badge> : null}
        </div>
        <h2 className="font-heading text-2xl leading-snug font-medium text-foreground">
          {service.name}
        </h2>
        {service.description ? (
          <CardDescription className="text-base">
            {service.description}
          </CardDescription>
        ) : null}
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt=""
            className="h-32 w-full rounded border border-input bg-muted object-contain"
          />
        ) : null}
      </header>

      <p className="flex flex-wrap items-baseline gap-x-2 px-8 py-6">
        <span className="font-heading text-4xl font-medium text-foreground">
          {formatAmount(service.unitAmount, service.currency)}
        </span>
        {interval ? (
          <span className="text-sm text-muted-foreground">{interval}</span>
        ) : null}
      </p>

      <div className="px-8 pb-8">
        <PlanDescriptions
          headingId={headingId}
          descriptions={service.descriptions}
        />
      </div>

      {/**
       * Contratar es `BILLING.MANAGE`; entrar a esta pantalla sólo pide `BILLING.READ`. A quien
       * puede consultar el catálogo pero no comprar se le enseña el plan y su precio, y se le
       * quita el botón: `CreateSubscriptionCheckoutUseCase` lo rechazaría de todas formas. La
       * fila se conserva vacía para no descuadrar el subgrid.
       */}
      {can('BILLING.MANAGE') ? (
        <CardFooter className="px-8 py-6">
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
      ) : (
        <div aria-hidden />
      )}
    </Card>
  );
}
