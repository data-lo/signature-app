'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SignatureVerificationCard, {
  type SignatureVerificationProps,
} from './SignatureVerificationCard';

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
  onRejectClick: () => void;
}

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
 * El acceso a "Configurar mi firma" vive FUERA del bloque inerte a propósito. Bug corregido: el
 * backend exige rúbrica/INE en archivo tanto para firmar como para rechazar, así que sin firma
 * configurada todas las acciones de abajo quedan inertes; el único camino para desbloquearse
 * estaba dentro del diálogo "Firma no configurada", que se puede cerrar y no vuelve a abrirse —
 * al cerrarlo la pantalla quedaba sin ninguna acción posible.
 */
export default function DocumentSignaturePanel({
  needsSimpleSignatureSetup,
  requiresVerification,
  canReject,
  verification,
  signing,
  onRejectClick,
}: DocumentSignaturePanelProps) {
  return (
    <div className="flex flex-col gap-2">
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
            ? 'pointer-events-none flex flex-col gap-2 opacity-50 select-none'
            : 'flex flex-col gap-2'
        }
      >
        {requiresVerification && (
          <SignatureVerificationCard {...verification} />
        )}

        {!requiresVerification && (
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

        {/*
          Bug corregido: "Rechazar documento" vivía dentro del bloque que exige la verificación
          confirmada, así que un firmante con 2FA pendiente no podía ni firmar ni rechazar — y si
          además el correo del código no salía, se quedaba sin ninguna acción disponible. Rechazar
          es negarse a firmar, no firmar: el backend nunca pidió el código para
          `PATCH /document/:id/reject` (ver reject() en signature-server), así que la única puerta
          era esta condición de UI. Sigue dentro del bloque `inert` de "firma no configurada"
          porque el backend sí exige firma en archivo para rechazar.
        */}
        {canReject && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onRejectClick}
          >
            Rechazar documento
          </Button>
        )}
      </div>
    </div>
  );
}
