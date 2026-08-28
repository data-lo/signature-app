'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  sealArtifactDownloadUrl,
  type PublicSealDownloads,
  type PublicSealEvidence,
} from '../_requests';
import { downloadBase64Evidence } from '../_utils/download-base64-evidence';
import {
  CanonicalXmlDownloadError,
  downloadCanonicalXml,
} from '../_utils/download-canonical-xml';

/**
 * Descargas de la constancia del PSC de un documento completado.
 *
 * El sello de tiempo y la constancia NOM-151 se descargan de su evidencia cruda
 * (`sealEvidence.*FileBase64`, un DER/ASN.1 en Base64): el botón la decodifica en el navegador y
 * arma el archivo ahí mismo (ver `downloadBase64Evidence`), así que se deshabilita —no se oculta—
 * cuando el documento no tiene esa evidencia.
 *
 * El XML canónico se pide al backend en el momento del clic —es el único que se consulta en vivo,
 * porque la cadena es grande y no tiene sentido cargarla en cada visita a la página— y se guarda
 * sólo después de comprobar la respuesta (ver `downloadCanonicalXml`). Antes era un `<a href
 * download>`: eso guardaba en disco cualquier cosa que respondiera el servidor, incluido el JSON
 * de un 404 renombrado a `.xml`.
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
  const [downloadingCanonical, setDownloadingCanonical] = useState(false);

  async function handleCanonicalDownload() {
    setDownloadingCanonical(true);

    try {
      await downloadCanonicalXml(
        sealArtifactDownloadUrl(documentId, 'canonical'),
        `cadena-canonica-${documentId}.xml`,
      );
    } catch (error) {
      toast.error(
        error instanceof CanonicalXmlDownloadError
          ? error.message
          : 'No se pudo descargar el XML canónico.',
      );
    } finally {
      setDownloadingCanonical(false);
    }
  }

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

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!downloads.canonical || downloadingCanonical}
        onClick={handleCanonicalDownload}
      >
        {downloadingCanonical ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="size-3.5" aria-hidden />
        )}
        XML canónico
      </Button>
    </div>
  );
}
