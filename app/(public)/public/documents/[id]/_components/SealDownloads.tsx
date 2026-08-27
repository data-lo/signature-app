'use client';

import { Download } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  sealArtifactDownloadUrl,
  type PublicSealDownloads,
  type PublicSealEvidence,
} from '../_requests';
import { downloadBase64Evidence } from '../_utils/download-base64-evidence';

/**
 * Descargas de la constancia del PSC de un documento completado.
 *
 * El sello de tiempo y la constancia NOM-151 se descargan de su evidencia cruda
 * (`sealEvidence.*FileBase64`, un DER/ASN.1 en Base64): el botón la decodifica en el navegador y
 * arma el archivo ahí mismo (ver `downloadBase64Evidence`), así que se deshabilita —no se oculta—
 * cuando el documento no tiene esa evidencia.
 *
 * La cadena canónica sigue siendo un enlace normal al backend, sin tocar: el backend responde con
 * `Content-Disposition: attachment` y el navegador la guarda solo. No se habilita su descarga en
 * Base64 todavía — ver historia "Habilitar descarga de evidencias de sellado en la vista pública".
 */
export function SealDownloads({
  documentId,
  downloads,
  sealEvidence,
}: {
  documentId: string;
  downloads: PublicSealDownloads;
  sealEvidence: PublicSealEvidence;
}) {
  const hasAnyDownload =
    Boolean(sealEvidence.integrityFileBase64) ||
    Boolean(sealEvidence.timestampFileBase64) ||
    downloads.canonical;

  if (!hasAnyDownload) {
    return (
      <p className="text-sm text-muted-foreground">
        Este documento no tiene constancia de conservación descargable.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!sealEvidence.integrityFileBase64}
        onClick={() => {
          if (!sealEvidence.integrityFileBase64) return;
          downloadBase64Evidence(
            sealEvidence.integrityFileBase64,
            `nom151-${documentId}.der`,
          );
        }}
      >
        <Download className="size-3.5" aria-hidden />
        Constancia NOM-151
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!sealEvidence.timestampFileBase64}
        onClick={() => {
          if (!sealEvidence.timestampFileBase64) return;
          downloadBase64Evidence(
            sealEvidence.timestampFileBase64,
            `sello-de-tiempo-${documentId}.tsr`,
          );
        }}
      >
        <Download className="size-3.5" aria-hidden />
        Sello de tiempo
      </Button>

      {downloads.canonical && (
        <a
          href={sealArtifactDownloadUrl(documentId, 'canonical')}
          download
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Download className="size-3.5" aria-hidden />
          Cadena canónica
        </a>
      )}
    </div>
  );
}
