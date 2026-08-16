'use client';

import type { CreateDocumentSummary } from '../_section-progress';

interface DocumentRequestSummaryProps {
  summary: CreateDocumentSummary;
}

/**
 * Resumen fijo de la solicitud: vive debajo de los tres acordeones y se muestra siempre, estén
 * abiertos o contraídos, para que el usuario nunca tenga que abrir una sección solo para
 * recordar qué eligió. Lo que todavía no se sabe se muestra como "Pendiente" (ver
 * `_section-progress.ts`), no se oculta: la ausencia de un dato también es información.
 */
export default function DocumentRequestSummary({
  summary,
}: DocumentRequestSummaryProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Documento', value: summary.documentName },
    { label: 'Páginas', value: summary.pageCount },
    { label: 'Tipo de firma', value: summary.signatureType },
    { label: 'Firmantes', value: summary.signerCount },
    { label: 'Espectadores', value: summary.viewerCount },
  ];

  return (
    <section
      aria-labelledby="document-request-summary-title"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="document-request-summary-title"
        className="text-sm font-medium text-foreground"
      >
        Resumen de la solicitud
      </h2>

      <dl className="mt-3 flex flex-col gap-2">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
