'use client';

import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Loader2,
  LockKeyhole,
  ScanFace,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import type { CurrentIdentityVerification } from '../_requests';
import VerificationQrPanel from './VerificationQrPanel';
import IdentityDetailDialog from './IdentityDetailDialog';

interface DiditVerificationCardProps {
  data: CurrentIdentityVerification;
  onStart: () => void;
  starting: boolean;
}

/**
 * Dirección de soporte, sólo si el despliegue la configura. No se codifica una dirección de
 * ejemplo: un correo inventado en la pantalla de un usuario bloqueado es peor que no mostrar
 * ninguno, porque manda su mensaje a un buzón que no existe.
 *
 * TODO(staging/producción): definir `NEXT_PUBLIC_SUPPORT_EMAIL` en el entorno de ambos
 * despliegues antes de liberar esta pantalla. Es el único camino de salida para un usuario en
 * IDENTITY_VERIFICATION_MAX_ATTEMPTS_EXCEEDED o IDENTITY_VERIFICATION_FAILED: sin la variable,
 * la tarjeta lo remite a "el canal de atención de tu organización", que es correcto pero
 * genérico, y el usuario queda sin a quién escribir. Al ser `NEXT_PUBLIC_*` se resuelve en
 * tiempo de build, así que hay que definirla en la imagen/pipeline, no sólo en runtime.
 */
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

/**
 * La tarjeta de Didit: la misma caja cambia de contenido según el avance del usuario.
 *
 * Es una sola tarjeta y no una pantalla por estado porque el usuario vuelve a esta misma URL
 * desde el correo, desde el callback de Didit y desde el menú: lo que cambia es en qué punto
 * está, no dónde está.
 */
export default function DiditVerificationCard({
  data,
  onStart,
  starting,
}: DiditVerificationCardProps) {
  const { signingCredentialStatus: status, verification } = data;

  switch (status) {
    case SigningCredentialStatus.IdentityVerificationPending:
    case SigningCredentialStatus.IdentityVerificationInProgress:
      /**
       * El backend sólo devuelve `url` mientras la sesión sigue viva. Si expiró estando el
       * usuario en esta pantalla, no se le deja un QR muerto: se le ofrece abrir una nueva.
       */
      return verification?.url ? (
        <StateCard
          tone="progress"
          title="Verificación de identidad con Didit"
          badge={<Badge variant="warning">Pendiente</Badge>}
        >
          <VerificationQrPanel url={verification.url} />
        </StateCard>
      ) : (
        <StateCard
          tone="progress"
          icon={<Clock className="size-5" />}
          title="La sesión de verificación expiró"
          description="El enlace que abrimos ya no es válido. Inicia una nueva verificación para continuar."
        >
          <CardActions>
            <StartButton
              label="Iniciar nueva verificación"
              onStart={onStart}
              starting={starting}
            />
          </CardActions>
        </StateCard>
      );

    case SigningCredentialStatus.IdentityVerificationInReview:
      return (
        <StateCard
          tone="progress"
          icon={<Clock className="size-5" />}
          title="Identidad en revisión"
          description="Estamos revisando tu información. La firma sigue bloqueada; te avisaremos en cuanto tengamos el resultado."
        />
      );

    case SigningCredentialStatus.IdentityVerificationRetryRequired:
      return (
        <StateCard
          tone="danger"
          icon={<AlertTriangle className="size-5" />}
          title="No pudimos validar tu identidad"
          description={
            verification?.failureReason ??
            'La verificación no se completó. Puedes intentarlo de nuevo.'
          }
        >
          <CardActions>
            <StartButton
              label="Intentar nuevamente"
              onStart={onStart}
              starting={starting}
            />
          </CardActions>
        </StateCard>
      );

    case SigningCredentialStatus.IdentityVerificationMaxAttemptsExceeded:
      return (
        <StateCard
          tone="muted"
          icon={<LockKeyhole className="size-5" />}
          title="Agotaste tus intentos de verificación"
          description="Por seguridad no podemos abrir más sesiones de verificación desde tu cuenta."
        >
          <SupportNote />
        </StateCard>
      );

    case SigningCredentialStatus.IdentityVerificationFailed:
      return (
        <StateCard
          tone="muted"
          icon={<LockKeyhole className="size-5" />}
          title="Verificación bloqueada"
          description="Tu verificación de identidad quedó bloqueada y no puede reiniciarse desde aquí."
        >
          <SupportNote />
        </StateCard>
      );

    case SigningCredentialStatus.SignaturePending:
    case SigningCredentialStatus.Configured:
      return (
        <StateCard
          tone="success"
          icon={<BadgeCheck className="size-5" />}
          title="Tu identidad ha sido verificada"
        >
          <CardActions align="end">
            <IdentityDetailDialog data={data} />
          </CardActions>
        </StateCard>
      );

    case SigningCredentialStatus.IdentityVerificationRequired:
    default:
      return (
        <StateCard
          tone="primary"
          icon={<ScanFace className="size-5" />}
          title="Validación de identidad"
          description="Captura tu INE y confirma que eres tú con una selfie en vivo. Toma menos de dos minutos."
        >
          <CardActions>
            <StartButton
              label="Iniciar verificación"
              onStart={onStart}
              starting={starting}
            />
          </CardActions>
        </StateCard>
      );
  }
}

type Tone = 'primary' | 'progress' | 'success' | 'danger' | 'muted';

const TONE_STYLES: Record<Tone, { card: string; icon: string }> = {
  primary: { card: 'border-primary/40', icon: 'text-primary' },
  progress: { card: 'border-amber-500/50', icon: 'text-amber-600' },
  success: {
    card: 'border-emerald-500/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  danger: { card: 'border-destructive/50', icon: 'text-destructive' },
  muted: { card: 'border-border', icon: 'text-muted-foreground' },
};

function StateCard({
  tone,
  icon,
  title,
  badge,
  description,
  children,
}: {
  tone: Tone;
  /**
   * Opcional: la tarjeta de verificación pendiente no lleva ninguno. El estado lo comunica el
   * badge, y el icono animado que había ahí antes sugería un proceso corriendo en el servidor
   * cuando lo que falta es que el usuario escanee el QR.
   */
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon ? <span className={styles.icon}>{icon}</span> : null}
          {title}
          {badge}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

/** Fila de acciones centrada, salvo los detalles de una identidad ya validada. */
function CardActions({
  children,
  align = 'center',
}: {
  children: React.ReactNode;
  align?: 'center' | 'end';
}) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${
        align === 'end' ? 'justify-end' : 'justify-center'
      }`}
    >
      {children}
    </div>
  );
}

function StartButton({
  label,
  onStart,
  starting,
}: {
  label: string;
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <Button type="button" onClick={onStart} disabled={starting}>
      {starting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Abriendo verificación...
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function SupportNote() {
  return (
    <p className="text-sm text-muted-foreground">
      Escribe a soporte para desbloquear tu cuenta
      {SUPPORT_EMAIL ? (
        <>
          {': '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </>
      ) : (
        ' desde el canal de atención de tu organización.'
      )}
    </p>
  );
}
