'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SignatureCaptureSessionStatus,
  type CreatedSignatureCaptureSession,
} from '@/lib/api/signature-capture';
import {
  useCancelSignatureCaptureSession,
  useSignatureCaptureSession,
} from '@/lib/hooks/useSignatureCapture';

/**
 * El QR con el que la captura continúa en el celular, y el sondeo que espera su resultado.
 *
 * **El QR se dibuja aquí y no lo manda el backend como imagen**, por lo mismo que el de la
 * verificación de identidad (ver `VerificationQrPanel`): la URL son unas decenas de bytes contra
 * los kilobytes de un PNG, el SVG se ve nítido a cualquier densidad de pantalla —un raster
 * escalado lo leen peor las cámaras— y `qrcode.react` no declara dependencias.
 *
 * **El sondeo es la única vía de vuelta.** Quien guarda la firma es el teléfono, contra el
 * backend: esta pantalla no se entera de nada si no pregunta. Se detiene solo al llegar a un
 * estado terminal (ver `useSignatureCaptureSession`).
 */
export default function MobileHandoffPanel({
  session,
  onDone,
}: {
  session: CreatedSignatureCaptureSession;
  onDone: () => void;
}) {
  const { data: status } = useSignatureCaptureSession(session.id);
  const cancelSession = useCancelSignatureCaptureSession();

  const current = status?.status ?? session.status;
  const completed = current === SignatureCaptureSessionStatus.Completed;
  const dead =
    current === SignatureCaptureSessionStatus.Expired ||
    current === SignatureCaptureSessionStatus.Cancelled;

  /**
   * Al confirmarse desde el celular, la tarjeta que envuelve a este panel ya releyó la credencial
   * (lo invalida `useSaveHandwrittenSignature`) y va a cambiar de estado sola. Se cierra el panel
   * para no dejar el QR de una captura ya consumida en pantalla.
   */
  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [completed, onDone]);

  if (completed) {
    return (
      <Panel>
        <BadgeCheck
          className="size-7 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <p className="text-sm font-medium">Firma recibida desde tu celular</p>
      </Panel>
    );
  }

  if (dead) {
    return (
      <Panel>
        <TriangleAlert className="size-7 text-amber-600" aria-hidden />
        <p className="text-sm">
          {current === SignatureCaptureSessionStatus.Expired
            ? 'El código expiró antes de que se completara la firma.'
            : 'La captura se canceló.'}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Volver a intentar
        </Button>
      </Panel>
    );
  }

  if (!session.qrUrl) {
    return (
      <Panel>
        <TriangleAlert className="size-7 text-destructive" aria-hidden />
        <p className="text-sm">
          No se pudo generar el código QR. Inténtalo de nuevo.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Volver
        </Button>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm">
        Escanea el código con tu celular para dibujar ahí tu firma.
      </p>

      <div className="rounded-lg bg-white p-4">
        <QRCodeSVG
          value={session.qrUrl}
          size={168}
          // El QR se lee por contraste: se fija el par de colores en vez de heredar el tema,
          // porque en modo oscuro un código claro sobre fondo oscuro no lo lee ninguna cámara.
          bgColor="#ffffff"
          fgColor="#000000"
          aria-label="Código QR para firmar desde tu celular"
        />
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {current === SignatureCaptureSessionStatus.Claimed
          ? 'Firmando desde el celular...'
          : 'Esperando a que escanees el código...'}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          // Se invalida el QR al salir en vez de dejarlo vivo hasta que expire: un código en
          // pantalla que ya nadie va a usar es un enlace abierto hacia la cuenta.
          cancelSession.mutate(session.id);
          onDone();
        }}
      >
        Cancelar
      </Button>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      {children}
    </div>
  );
}
