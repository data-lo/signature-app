import type { CurrentIdentityVerification } from '../_requests';

interface IdentityDetailDialogProps {
  data: CurrentIdentityVerification;
}

/**
 * Detalle de la validación, visible directamente dentro de la tarjeta: cuándo se validó y con qué
 * verificación.
 *
 * Ya no muestra el desglose de comprobaciones de Didit (lectura de la identificación, comparación
 * del rostro y prueba de vida): la historia "Ocultar información de tipo de validación DIDI en
 * Identidad y Firma" lo retiró de la pantalla. El backend lo sigue mandando en
 * `verification.checks`; este componente simplemente no lo lee, así que se ve igual con o sin ese
 * dato.
 */
export default function IdentityVerificationDetails({
  data,
}: IdentityDetailDialogProps) {
  return (
    <section aria-label="Detalle de la verificación de identidad">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <DetailRow
          label="Validada el"
          value={formatDateTime(data.identityVerifiedAt)}
        />
        <DetailRow
          label="Verificación"
          value={data.verification?.id ?? 'No disponible'}
        />
      </dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-medium">{value}</dd>
    </>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return 'No disponible';

  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
