import { useEffect, useRef } from 'react';
import { formatLongDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';
import { SignatureType } from '@/lib/enums/document';
import type { PublicSigner } from '../_requests';
import { InfoRow } from './VerificationLayout';

/**
 * Evidencia de UNA firma en un documento ya completado.
 *
 * Los campos son los mismos que imprime la hoja de firmas anexada al PDF, y cambian según el tipo
 * de firma: la simple se acredita con el código de un solo uso, la avanzada con el certificado del
 * SAT y la firma criptográfica. Ninguno de los dos muestra los campos del otro — el backend manda
 * en `null` los que no aplican y `InfoRow` oculta el renglón.
 *
 * El texto legal ("Sustentada") NO se escribe aquí: viaja en `legalBacking` desde el backend, que
 * es el mismo valor que se estampa en el PDF. Es la única forma de garantizar que la pantalla y el
 * documento impreso digan exactamente lo mismo.
 *
 * `highlighted` marca la firma cuyo QR se escaneó (ver `useHighlightedSigner`). Un documento puede
 * llevar varias firmas y la lista puede quedar larga: sin señalarla, quien escanea el código
 * estampado junto a UNA firma aterriza en la página y tiene que buscar cuál era. Además de
 * destacarla, la tarjeta se trae sola a la vista.
 */
export function SignerEvidenceCard({
  signer,
  highlighted = false,
}: {
  signer: PublicSigner;
  highlighted?: boolean;
}) {
  const isAdvanced = signer.signatureType === SignatureType.Fiel;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlighted) return;

    // `block: 'center'` y no el default: deja la tarjeta en medio de la pantalla en vez de pegada
    // al borde superior, que en un teléfono la esconde tras la barra del navegador.
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  return (
    <div
      ref={cardRef}
      data-slot="signer-evidence"
      data-signature-type={signer.signatureType ?? undefined}
      data-highlighted={highlighted || undefined}
      className={cn(
        'rounded-lg border border-border p-4',
        highlighted &&
          'border-primary bg-primary/5 ring-2 ring-primary/40 dark:bg-primary/10',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{signer.name}</h3>
        {highlighted && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Firma del código escaneado
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-col">
        <InfoRow label="Tipo de firma" value={signer.signatureTypeLabel} />
        <InfoRow label="IP" value={signer.ipAddress} />
        <InfoRow label="Sustentada" value={signer.legalBacking} />

        {isAdvanced ? (
          <>
            <InfoRow
              label="Número de serie del certificado"
              value={signer.certificateSerialNumber}
              mono
            />
            <InfoRow
              label="Firma electrónica"
              value={signer.electronicSignature}
              mono
            />
          </>
        ) : (
          <InfoRow label="OTP Code" value={signer.otpCode} mono />
        )}

        <InfoRow
          label="Fecha de firma"
          // El backend manda UTC; se formatea en la zona de quien consulta, igual que la
          // constancia de firma avanzada del QR.
          value={signer.signedAt ? formatLongDateTime(signer.signedAt) : null}
        />
        {/* Sin renglón de geolocalización (historia "Ocultar geolocalización en hojas de firma y
            vistas públicas"): esta pantalla la abre cualquiera con el id, sin sesión. El backend
            dejó de mandar el dato, así que tampoco es que esté disponible y se oculte. */}
      </div>
    </div>
  );
}
