'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/error-handler';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useCancelSubscription } from '../_hooks/useCancelSubscription';
import { useResumeSubscription } from '../_hooks/useResumeSubscription';
import { formatPeriodEnd } from '../_utils/format-period-end';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';
import AddDocumentsDialog from './AddDocumentsDialog';
import type { BillingAccess, BillingProfileStatus } from '@/lib/api/billing';
import { shouldShowBiometricCredits } from '@/lib/biometric-credits';
import { cn } from '@/lib/utils';
import { PLANS_ROUTE } from '@/lib/billing/organization-plan-access';

/** Título y descripción del plan con el que nace toda cuenta. */
export const FREE_PLAN_TITLE = 'Plan gratuito';
export const FREE_PLAN_DESCRIPTION =
  'Ideal para comenzar a firmar documentos. Compra documentos adicionales o explora otros planes cuando lo necesites.';

/** Nota del pie junto a "Comprar documentos": la compra es única y no toca el plan. */
export const PURCHASE_NOTE =
  'La compra de documentos no modifica tu suscripción.';

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'outline';

/**
 * Estado del perfil de facturación, rotulado como estado DEL PLAN (de ahí el masculino: la
 * tarjeta se encabeza con "Plan actual") y con el color de badge que le corresponde.
 */
const STATUS_BADGES: Record<
  BillingProfileStatus,
  { label: string; variant: BadgeVariant }
> = {
  FREE: { label: 'Activo', variant: 'success' },
  INCOMPLETE: { label: 'Pendiente de confirmación', variant: 'warning' },
  ACTIVE: { label: 'Activo', variant: 'success' },
  PAST_DUE: { label: 'Pago pendiente', variant: 'warning' },
  CANCELED: { label: 'Cancelado', variant: 'outline' },
};

/** Badge de un plan activo cuya baja ya está programada para el fin del periodo. */
const SCHEDULED_CANCELLATION_BADGE = {
  label: 'Cancelación programada',
  variant: 'warning',
} as const;

/**
 * Rotula un plan del catálogo capitalizándolo. El catálogo es un conjunto abierto: traducirlo con
 * un mapa obligaría a desplegar esta app cada vez que el backend da de alta un plan.
 *
 * @param planType - Identificador del plan (`'plus'`, `'premium'`…).
 * @returns El identificador con la inicial en mayúscula.
 * @throws Nunca lanza.
 *
 * @example
 * ```ts
 * planLabel('plus'); // 'Plus'
 * ```
 */
function planLabel(planType: string): string {
  return planType.charAt(0).toUpperCase() + planType.slice(1);
}

/**
 * Rótulo de sección en versalitas, el mismo patrón para "Plan actual", "Saldo disponible",
 * "Siguiente paso" y "Periodo".
 *
 * @param props.children - Texto del rótulo.
 * @returns Un párrafo pequeño en mayúsculas con espaciado amplio.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <Eyebrow>Saldo disponible</Eyebrow>
 * ```
 */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/**
 * Saldo de documentos destacado: la cifra grande en el color de marca y, al lado, qué significa.
 *
 * `documentsIncludedPerPeriod` nulo (lo fija el contrato) o `0` (el gratuito, que concede
 * documentos de bienvenida) no se anuncian: un tope que no existe o un "0 por periodo" no le
 * dicen nada útil a quien sí tiene saldo.
 *
 * @param props.available - Documentos disponibles.
 * @param props.documentsIncludedPerPeriod - Tope del plan por periodo, si lo fija.
 * @param props.billing - Estado de facturación, para el saldo biométrico.
 * @returns El bloque del saldo.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <DocumentBalance available={76} documentsIncludedPerPeriod={null} billing={subscription} />
 * ```
 */
function DocumentBalance({
  available,
  documentsIncludedPerPeriod,
  billing,
}: {
  available: number;
  documentsIncludedPerPeriod: number | null;
  billing: Pick<BillingAccess, 'credits' | 'actions'>;
}) {
  return (
    <section aria-labelledby="document-balance" className="flex flex-col gap-3">
      <Eyebrow>
        <span id="document-balance">Saldo disponible</span>
      </Eyebrow>
      <div className="flex items-center gap-4">
        <span className="font-heading text-5xl leading-none font-medium text-primary tabular-nums">
          {available}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-medium text-foreground">
            {available === 1
              ? 'Documento disponible'
              : 'Documentos disponibles'}
          </span>
          <span className="text-sm text-muted-foreground">
            {documentsIncludedPerPeriod
              ? `De ${documentsIncludedPerPeriod} incluidos por periodo.`
              : 'Listos para enviar a firma.'}
          </span>
        </div>
      </div>
      {shouldShowBiometricCredits(billing) ? (
        <p className="text-sm text-muted-foreground">
          Firmas biométricas disponibles:{' '}
          <strong className="font-medium text-foreground">
            {billing.credits.biometric.available}
          </strong>
          .
        </p>
      ) : null}
    </section>
  );
}

/**
 * Esqueleto común de la tarjeta del plan: encabezado (rótulo, título, descripción y estado),
 * cuerpo en dos columnas (saldo y bloque lateral) y pie con la nota y las acciones.
 *
 * En pantallas angostas las columnas se apilan y el pie pone las acciones encima de la nota y a
 * todo el ancho, para que los botones sigan siendo fáciles de pulsar.
 *
 * @param props.title - Nombre del plan.
 * @param props.description - Qué significa el estado actual.
 * @param props.badge - Estado del plan.
 * @param props.balance - Bloque del saldo.
 * @param props.aside - Columna derecha (siguiente paso o periodo); opcional.
 * @param props.note - Texto del pie a la izquierda; opcional.
 * @param props.actions - Botones del pie; si no hay, el pie no se dibuja.
 * @param props.feedback - Progreso o error de una operación; opcional.
 * @returns La tarjeta completa.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <PlanCard title="Plan gratuito" description="…" badge={STATUS_BADGES.FREE} balance={…} />
 * ```
 */
function PlanCard({
  title,
  description,
  badge,
  balance,
  aside,
  note,
  actions,
  feedback,
}: {
  title: string;
  description: string;
  badge: { label: string; variant: BadgeVariant };
  balance: ReactNode;
  aside?: ReactNode;
  note?: string;
  actions?: ReactNode;
  feedback?: ReactNode;
}) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="gap-2">
        <Eyebrow>Plan actual</Eyebrow>
        <h2 className="font-heading text-2xl leading-snug font-medium text-foreground">
          {title}
        </h2>
        <CardDescription className="max-w-prose text-base">
          {description}
        </CardDescription>
        <CardAction>
          <Badge variant={badge.variant} className="h-7 px-2.5 text-sm">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-current opacity-80"
            />
            {badge.label}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="border-t pt-(--card-spacing)">
        <div
          className={cn(
            'grid gap-8',
            aside && 'md:grid-cols-2 md:gap-0 md:divide-x',
          )}
        >
          <div className={cn(aside && 'md:pr-8')}>{balance}</div>
          {aside ? (
            <div className="border-t pt-8 md:border-t-0 md:pt-0 md:pl-8">
              {aside}
            </div>
          ) : null}
        </div>
        {feedback ? <div className="mt-6">{feedback}</div> : null}
      </CardContent>

      {actions ? (
        <CardFooter className="flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          {note ? (
            <p className="text-sm text-muted-foreground">{note}</p>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/**
 * "Ver planes" como acción secundaria del pie.
 *
 * @returns Enlace con aspecto de botón contorneado a `/dashboard/plans`.
 * @throws Nunca lanza.
 *
 * @example
 * ```tsx
 * <SeePlansButton />
 * ```
 */
function SeePlansButton() {
  return (
    <Button render={<Link href={PLANS_ROUTE} />} variant="outline">
      Ver planes
    </Button>
  );
}

/**
 * Estado actual de la suscripción de la CUENTA ACTIVA.
 *
 * Se lee del backend y no de la URL de retorno: es la única fuente que refleja lo que el webhook
 * ya confirmó. Justo después de pagar puede seguir diciendo "pendiente" unos segundos, y el aviso
 * de arriba explica esa espera. Cambiar de cuenta redibuja la tarjeta sola porque la cuenta va en
 * la `queryKey`.
 *
 * **Jerarquía de acciones:** una sola primaria por grupo, "Comprar documentos". "Ver planes" y
 * "Reanudar suscripción" son secundarias y "Cancelar suscripción" conserva su variante
 * destructiva atenuada, que no compite con la primaria.
 *
 * **Permisos:** comprar, cancelar y reanudar exigen `BILLING.MANAGE`; "Ver planes" es navegación y
 * le basta `BILLING.READ`, que ya exige la página. Esconder los botones no protege nada —cada
 * endpoint vuelve a exigir el permiso—; evita ofrecer una acción que respondería 403.
 *
 * @returns La tarjeta del plan, o su estado de carga o de error.
 * @throws Nunca lanza: los fallos de carga y de las operaciones se dibujan en la propia tarjeta.
 *
 * @example
 * ```tsx
 * <SubscriptionStateCard />
 * ```
 */
export default function SubscriptionStateCard() {
  const { data: subscription, isPending, isError } = useBillingAccess();
  const { can } = usePermissions();
  const canManage = can('BILLING.MANAGE');

  /**
   * Las mutaciones viven acá y no en sus botones: el modal de cancelación se cierra al confirmar,
   * así que su progreso y su posible error tienen que dibujarse en la tarjeta. Van antes de las
   * salidas tempranas por las reglas de los hooks.
   */
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();

  /**
   * Un solo indicador para las dos: cancelar aparece cuando NO hay baja programada y reanudar
   * cuando SÍ, así que nunca están en curso a la vez ni sus errores compiten.
   */
  const operationInProgress =
    cancelMutation.isPending || resumeMutation.isPending;
  const operationError = cancelMutation.error ?? resumeMutation.error;

  if (isPending) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Cargando tu suscripción...
      </div>
    );
  }

  if (isError || !subscription) {
    return (
      <p role="alert" className="text-sm text-destructive">
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
          <Button render={<Link href={PLANS_ROUTE} />} variant="brand">
            Ver planes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const balance = (
    <DocumentBalance
      available={subscription.credits.document.available}
      documentsIncludedPerPeriod={
        subscription.limits.documentsIncludedPerPeriod
      }
      billing={subscription}
    />
  );

  /**
   * El plan gratuito va antes del bloque general y no puede caer en él: comparte
   * `hasActiveSubscription: false` con un plan de pago caducado, pero significan lo contrario. Es
   * el plan con el que nace la cuenta y está vigente.
   *
   * Comprar documentos sueltos también vale aquí: es una compra única que no crea ni modifica
   * ninguna suscripción. Qué paquetes le corresponden lo decide el backend.
   */
  if (subscription.status === 'FREE') {
    return (
      <PlanCard
        title={FREE_PLAN_TITLE}
        description={FREE_PLAN_DESCRIPTION}
        badge={STATUS_BADGES.FREE}
        balance={balance}
        aside={
          <section
            aria-labelledby="next-step"
            className="flex flex-col items-start gap-3"
          >
            <Eyebrow>
              <span id="next-step">Siguiente paso</span>
            </Eyebrow>
            <h3 className="text-base font-medium text-foreground">
              ¿Necesitas más capacidad?
            </h3>
            <p className="text-sm text-muted-foreground">
              Compra documentos sin cambiar de plan, o compara las opciones
              disponibles.
            </p>
            <Link
              href={PLANS_ROUTE}
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Conoce lo que incluye cada plan
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        }
        note={canManage ? PURCHASE_NOTE : undefined}
        actions={
          <>
            <SeePlansButton />
            {canManage ? <AddDocumentsDialog /> : null}
          </>
        }
      />
    );
  }

  /**
   * Cancelar sólo con una suscripción activa que todavía se renueva: con la baja ya programada
   * sigue activa, y volver a ofrecerlo invitaría a un clic que el backend rechaza con 409.
   */
  const canCancel =
    subscription.hasActiveSubscription && !subscription.cancelAtPeriodEnd;

  /**
   * Contratar sólo donde el backend lo permite: `CreateSubscriptionCheckoutUseCase` rechaza con
   * 409 cualquier checkout sobre un perfil ACTIVE, incluido uno con la baja programada.
   */
  const canSubscribe = !subscription.hasActiveSubscription;

  const periodEnd = formatPeriodEnd(subscription.currentPeriodEnd);

  /**
   * Con la baja programada, este aviso SUSTITUYE al del periodo vigente: los dos hablan de la
   * misma fecha, y éste dice además que no se renovará.
   */
  const periodNote = subscription.cancelAtPeriodEnd
    ? periodEnd
      ? `Tu suscripción seguirá activa hasta el ${periodEnd}. No se renovará automáticamente.`
      : 'Tu suscripción seguirá activa hasta el final del periodo vigente. No se renovará automáticamente.'
    : periodEnd
      ? `Periodo vigente hasta ${periodEnd}.`
      : null;

  const badge = subscription.cancelAtPeriodEnd
    ? SCHEDULED_CANCELLATION_BADGE
    : STATUS_BADGES[subscription.status];

  const actions = (
    <>
      {canManage && canCancel ? (
        <CancelSubscriptionDialog
          currentPeriodEnd={subscription.currentPeriodEnd}
          onConfirm={() => cancelMutation.mutate()}
          disabled={operationInProgress}
        />
      ) : null}
      {/**
       * El camino de vuelta: sin él, quien programa la baja no podría cancelar (ya está
       * programada) ni contratar (el checkout lo rechaza), y deshacerlo exigiría el Dashboard de
       * Stripe. Secundaria: la primaria del grupo es "Comprar documentos".
       */}
      {canManage && subscription.cancelAtPeriodEnd ? (
        <Button
          variant="outline"
          onClick={() => resumeMutation.mutate()}
          disabled={operationInProgress}
        >
          Reanudar suscripción
        </Button>
      ) : null}
      {canSubscribe ? <SeePlansButton /> : null}
      {/**
       * No depende de la baja programada: los paquetes siguen disponibles porque el plan sigue
       * activo hasta el fin del periodo.
       */}
      {canManage ? <AddDocumentsDialog /> : null}
    </>
  );

  const hasActions = canManage || canSubscribe;

  return (
    <PlanCard
      title={
        subscription.currentPlanType
          ? `Plan ${planLabel(subscription.currentPlanType)}`
          : 'Tu plan'
      }
      description={
        subscription.hasActiveSubscription
          ? 'Tu suscripción está al corriente y puedes firmar documentos.'
          : 'Tu suscripción todavía no habilita la firma de documentos.'
      }
      badge={badge}
      balance={balance}
      aside={
        periodNote ? (
          <section aria-labelledby="period" className="flex flex-col gap-3">
            <Eyebrow>
              <span id="period">Periodo</span>
            </Eyebrow>
            <p className="text-sm text-muted-foreground">{periodNote}</p>
          </section>
        ) : undefined
      }
      note={canManage ? PURCHASE_NOTE : undefined}
      actions={hasActions ? actions : undefined}
      feedback={
        operationInProgress || operationError ? (
          <div className="flex flex-col gap-2">
            {operationInProgress ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {cancelMutation.isPending
                  ? 'Cancelando tu suscripción...'
                  : 'Reanudando tu suscripción...'}
              </p>
            ) : null}
            {operationError ? (
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(
                  operationError,
                  'No pudimos actualizar tu suscripción. Intenta de nuevo en unos minutos.',
                )}
              </p>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}
