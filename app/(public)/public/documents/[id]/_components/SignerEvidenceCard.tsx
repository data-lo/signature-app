import { formatLongDateTime } from '@/lib/format-datetime';
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
 */
export function SignerEvidenceCard({ signer }: { signer: PublicSigner }) {
  const isAdvanced = signer.signatureType === SignatureType.Fiel;

  return (
    <div
      data-slot="signer-evidence"
      data-signature-type={signer.signatureType ?? undefined}
      className="rounded-lg border border-border p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">{signer.name}</h3>

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
        <InfoRow label="Geolocalización" value={signer.geoLocation} />
      </div>
    </div>
  );
}
