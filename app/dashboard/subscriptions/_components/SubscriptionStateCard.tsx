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
import { getErrorMessage } from '@/lib/error-handler';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { useCancelSubscription } from '../_hooks/useCancelSubscription';
import { useResumeSubscription } from '../_hooks/useResumeSubscription';
import { formatPeriodEnd } from '../_utils/format-period-end';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';
import AddDocumentsDialog from './AddDocumentsDialog';
import type { BillingProfileStatus } from '@/lib/api/billing';

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
 * Documentos disponibles, con su tope por periodo cuando el plan lo fija.
 *
 * `documentsIncludedPerPeriod` nulo significa "no lo fija el plan" —se negocia por contrato— y
 * entonces se calla en vez de inventar un número: anunciar un tope que no existe es peor que no
 * anunciar ninguno. Un plan que incluye `0` por periodo (el gratuito, que en su lugar concede
 * documentos de bienvenida) tampoco lo anuncia, porque "0 por periodo" no le dice nada útil a
 * quien sí tiene saldo comprado.
 */
function SaldoDeDocumentos({
  creditsAvailable,
  documentsIncludedPerPeriod,
}: {
  creditsAvailable: number;
  documentsIncludedPerPeriod: number | null;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Documentos disponibles: <strong>{creditsAvailable}</strong>
      {documentsIncludedPerPeriod
        ? ` de ${documentsIncludedPerPeriod} incluidos por periodo.`
        : '.'}
    </p>
  );
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
  const { data: subscription, isPending, isError } = useBillingAccess();

  /**
   * Las dos mutaciones viven acá y no en sus botones, porque acá es donde el usuario se queda: el
   * modal de cancelación se cierra al confirmar, así que su estado de carga y su posible error
   * tienen que dibujarse en la tarjeta o no se ven en ninguna parte.
   *
   * Van antes de las salidas tempranas de abajo por las reglas de los hooks, que no admiten que
   * el número de llamadas cambie entre renders.
   */
  const cancelar = useCancelSubscription();
  const reanudar = useResumeSubscription();

  /**
   * Se comparte un solo indicador entre las dos: sólo una puede estar disponible a la vez —el
   * botón de cancelar aparece cuando NO hay baja programada y el de reanudar cuando SÍ—, así que
   * no hay forma de que las dos estén en curso ni de que sus errores compitan.
   */
  const operacionEnCurso = cancelar.isPending || reanudar.isPending;
  const falloDeOperacion = cancelar.error ?? reanudar.error;

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
        <CardContent className="flex flex-col gap-4">
          <SaldoDeDocumentos
            creditsAvailable={subscription.creditsAvailable}
            documentsIncludedPerPeriod={
              subscription.limits.documentsIncludedPerPeriod
            }
          />
          {/**
           * Comprar documentos sueltos también desde el plan gratuito: es una compra única que no
           * crea ni modifica ninguna suscripción, así que no exige tener plan de pago. Qué
           * paquetes le corresponden —y a qué precio— lo decide el backend según su plan.
           */}
          <div className="flex flex-wrap items-center gap-2">
            <Button render={<Link href="/dashboard/plans" />} variant="brand">
              Ver planes
            </Button>
            <AddDocumentsDialog />
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * El botón de cancelar aparece SÓLO con una suscripción activa que todavía se renueva. Las dos
   * condiciones son distintas y hacen falta las dos: con la baja ya programada la suscripción
   * sigue activa, y volver a ofrecer "Cancelar" invitaría a un clic que el backend rechaza con un
   * 409.
   */
  const puedeCancelar =
    subscription.hasActiveSubscription && !subscription.cancelAtPeriodEnd;

  /**
   * Contratar sólo donde el backend lo permite. `CreateSubscriptionCheckoutUseCase` rechaza con
   * 409 cualquier checkout sobre un perfil ACTIVE —incluido uno con la baja programada, que sigue
   * ACTIVE hasta que termine el periodo—, así que ofrecerlo ahí sería mandar al usuario a un
   * error. En INCOMPLETE, PAST_DUE y CANCELED sí se puede volver a contratar.
   */
  const puedeContratar = !subscription.hasActiveSubscription;

  const fechaTermino = formatPeriodEnd(subscription.currentPeriodEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {subscription.currentPlanType
            ? `Plan ${planLabel(subscription.currentPlanType)} — ${STATUS_LABELS[subscription.status]}`
            : STATUS_LABELS[subscription.status]}
        </CardTitle>
        <CardDescription>
          {subscription.hasActiveSubscription
            ? 'Tu suscripción está al corriente y puedes firmar documentos.'
            : 'Tu suscripción todavía no habilita la firma de documentos.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <SaldoDeDocumentos
          creditsAvailable={subscription.creditsAvailable}
          documentsIncludedPerPeriod={
            subscription.limits.documentsIncludedPerPeriod
          }
        />

        {/**
         * Con la baja programada, este aviso SUSTITUYE al del periodo vigente en vez de sumarse:
         * los dos hablan de la misma fecha, y decirla dos veces con distinta redacción haría dudar
         * de si son dos cosas distintas. Éste dice además lo que el otro no: que no se renovará.
         */}
        {subscription.cancelAtPeriodEnd ? (
          <p className="text-sm text-muted-foreground">
            {fechaTermino
              ? `Tu suscripción seguirá activa hasta el ${fechaTermino}. No se renovará automáticamente.`
              : 'Tu suscripción seguirá activa hasta el final del periodo vigente. No se renovará automáticamente.'}
          </p>
        ) : fechaTermino ? (
          <p className="text-sm text-muted-foreground">
            Periodo vigente hasta {fechaTermino}.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {/**
           * Va el primero de la fila y no detrás de "Cancelar": es la acción que un usuario con
           * plan vigente busca aquí, y la baja no debería ser lo primero que encuentre.
           *
           * No depende de `puedeCancelar` ni de `cancelAtPeriodEnd`: los paquetes siguen
           * disponibles con la baja programada, porque el plan sigue activo hasta el fin del
           * periodo y su tarifa sigue siendo la suya.
           */}
          <AddDocumentsDialog />

          {puedeCancelar ? (
            <CancelSubscriptionDialog
              currentPeriodEnd={subscription.currentPeriodEnd}
              onConfirm={() => cancelar.mutate()}
              disabled={operacionEnCurso}
            />
          ) : null}

          {/**
           * El camino de vuelta. Sin él, quien programa la baja se queda sin ninguna acción: no
           * puede cancelar (ya está programada) ni contratar (el perfil sigue ACTIVE y el checkout
           * lo rechaza con 409), y deshacerlo exigiría entrar al Dashboard de Stripe.
           */}
          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="brand"
              onClick={() => reanudar.mutate()}
              disabled={operacionEnCurso}
            >
              Reanudar suscripción
            </Button>
          ) : null}

          {puedeContratar ? (
            <Button render={<Link href="/dashboard/plans" />} variant="brand">
              Ver planes
            </Button>
          ) : null}

          {operacionEnCurso ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {cancelar.isPending
                ? 'Cancelando tu suscripción...'
                : 'Reanudando tu suscripción...'}
            </span>
          ) : null}
        </div>

        {falloDeOperacion ? (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(
              falloDeOperacion,
              'No pudimos actualizar tu suscripción. Intenta de nuevo en unos minutos.',
            )}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
