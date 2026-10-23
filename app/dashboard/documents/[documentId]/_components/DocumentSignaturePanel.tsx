'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import SignatureVerificationCard, {
  type SignatureVerificationProps,
} from './SignatureVerificationCard';
import BiometricSignaturePanel, {
  type BiometricSigningProps,
} from '@/components/biometric-signature/BiometricSignaturePanel';
import ShareDocumentLinkAction from './ShareDocumentLinkAction';
import type { ShareLinkStatus } from '../_hooks/useShareDocumentLink';

export interface DocumentSigningProps {
  /** Motivo por el que la ubicación no pudo obtenerse; bloquea la firma hasta corregirlo. */
  geoBlockedReason: string | null;
  isRequestingLocation: boolean;
  isSigning: boolean;
  onSign: () => void;
}

interface DocumentSignaturePanelProps {
  /** Firma simple exigida y todavía sin configurar: todo el bloque de acciones queda inerte. */
  needsSimpleSignatureSetup: boolean;
  /** true mientras falte autorizar la firma con el código de validación. */
  requiresVerification: boolean;
  canReject: boolean;
  verification: SignatureVerificationProps;
  signing: DocumentSigningProps;
  /**
   * Sólo para un firmante con firma BIOMETRIC: reemplaza "Continuar a firmar" por el flujo de
   * Didit. `undefined` para los demás tipos de firma.
   */
  biometric?: BiometricSigningProps;
  /**
   * El firmante biométrico intentó firmar sin haber verificado su identidad: se muestra el
   * `ErrorAlert` con el camino a "Identidad y firma" y la sesión de Didit no se abre.
   */
  biometricIdentityRequired?: boolean;
  onRejectClick: () => void;
  /** Acción secundaria: acompaña la firma para mantener el flujo en un único panel. */
  share: {
    status: ShareLinkStatus;
    publicUrl: string | null;
    onShare: () => void;
    onDismissFallback: () => void;
  };
}

/** Título del aviso de firma biométrica sin identidad verificada. */
export const BIOMETRIC_IDENTITY_REQUIRED_TITLE = 'Verifica tu identidad';

/** Mensaje del aviso de firma biométrica sin identidad verificada. */
export const BIOMETRIC_IDENTITY_REQUIRED_MESSAGE =
  'Para firmar con biometría primero necesitas validar tu identidad. Valídala y vuelve a intentarlo.';

function signButtonLabel({
  isRequestingLocation,
  isSigning,
  geoBlockedReason,
}: DocumentSigningProps): string {
  if (isRequestingLocation) return 'Obteniendo ubicación...';
  if (isSigning) return 'Firmando...';
  if (geoBlockedReason) return 'Reintentar con ubicación';
  return 'Continuar a firmar';
}

/**
 * Acciones del firmante: autorizar con código si aplica, firmar y rechazar.
 *
 * Lo único que se bloquea sin credencial configurada es firmar: el aviso "Configurar mi firma" y
 * el botón "Rechazar documento" quedan FUERA del bloque inerte.
 *
 * Bug corregido: antes el bloque inerte envolvía todo, incluido rechazar, y el único camino para
 * desbloquearse estaba dentro del diálogo "Firma no configurada", que se puede cerrar y no
 * vuelve a abrirse — al cerrarlo la pantalla quedaba sin ninguna acción posible.
 */
export default function DocumentSignaturePanel({
  needsSimpleSignatureSetup,
  requiresVerification,
  canReject,
  verification,
  signing,
  biometric,
  biometricIdentityRequired = false,
  onRejectClick,
  share,
}: DocumentSignaturePanelProps) {
  return (
    <section
      aria-label="Acciones de firma"
      className="flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      {needsSimpleSignatureSetup && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>
            Para firmar documentos con tu firma digital simple, esta debe estar
            configurada.
          </p>
          <Button
            nativeButton={false}
            size="sm"
            render={<Link href="/dashboard/personal-documents/identity" />}
          >
            Configurar mi firma
          </Button>
        </div>
      )}

      <div
        inert={needsSimpleSignatureSetup}
        aria-disabled={needsSimpleSignatureSetup}
        className={
          needsSimpleSignatureSetup
            ? 'pointer-events-none flex flex-col gap-3 opacity-50 select-none'
            : 'flex flex-col gap-3'
        }
      >
        {requiresVerification && (
          <SignatureVerificationCard {...verification} />
        )}

        {/*
          El código de verificación va ANTES también en la firma biométrica: el backend lo exige
          para abrir la sesión de Didit, no sólo para registrar la firma.
        */}
        {!requiresVerification && biometric && biometricIdentityRequired && (
          <ErrorAlert
            title={BIOMETRIC_IDENTITY_REQUIRED_TITLE}
            message={
              <>
                <p>{BIOMETRIC_IDENTITY_REQUIRED_MESSAGE}</p>
                <Link
                  href="/dashboard/personal-documents/identity"
                  className="font-medium underline underline-offset-3"
                >
                  Verificar mi identidad
                </Link>
              </>
            }
          />
        )}

        {!requiresVerification && biometric && (
          <BiometricSignaturePanel {...biometric} />
        )}

        {!requiresVerification && !biometric && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Al confirmar, solicitaremos tu ubicación para registrarla como
              parte de la evidencia de esta firma. Es obligatoria: sin ella no
              es posible firmar el documento.
            </p>
            {signing.geoBlockedReason && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                No se puede firmar sin tu ubicación: {signing.geoBlockedReason}.
                Habilita el permiso de ubicación en tu navegador y vuelve a
                intentarlo.
              </div>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={signing.isRequestingLocation || signing.isSigning}
              onClick={signing.onSign}
            >
              {signButtonLabel(signing)}
            </Button>
          </div>
        )}
      </div>

      <ShareDocumentLinkAction {...share} compact />

      {/*
        "Rechazar documento" vive FUERA del bloque inerte, y fuera también del bloque que exige
        la verificación confirmada.

        Rechazar es negarse a firmar, no firmar: no produce ninguna firma, así que no necesita
        ni el código de 2FA ni la credencial configurada — el backend no pide ninguna de las dos
        para `PATCH /document/:id/reject`. Las dos veces que estuvo dentro de un bloque
        bloqueado el resultado fue el mismo: un firmante sin salida y un documento esperando
        para siempre una respuesta que esa persona no podía dar.
      */}
      {canReject && (
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRejectClick}
          >
            Rechazar documento
          </Button>
        </div>
      )}
    </section>
  );
}
