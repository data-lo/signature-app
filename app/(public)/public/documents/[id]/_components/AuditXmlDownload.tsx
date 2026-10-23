'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { auditXmlDownloadUrl } from '../_requests';
import {
  AuditXmlDownloadError,
  downloadAuditXml,
} from '../_utils/download-audit-xml';

/**
 * Descarga del XML de auditoría: el expediente completo del documento en un solo archivo.
 *
 * Va aparte de `SealDownloads` porque no es un artefacto de la constancia del PSC. Aquellos son
 * piezas que el proveedor emitió y que están guardadas; éste lo arma el backend en el momento del
 * clic con todo lo que el documento tiene —los tres PDFs, la evidencia del sello si existe y la
 * acreditación de cada firmante— y no se guarda en ningún lado. Por eso también se ofrece siempre
 * que el documento esté completado, aunque nunca haya pasado por el PSC.
 *
 * El botón se deshabilita mientras la petición está en curso: el archivo puede pesar decenas de MB
 * y sin eso el usuario, al no ver respuesta inmediata, vuelve a hacer clic y dispara otra
 * generación completa en el backend.
 */
export function AuditXmlDownload({ documentId }: { documentId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);

    try {
      await downloadAuditXml(
        auditXmlDownloadUrl(documentId),
        `auditoria-${documentId}.xml`,
      );
    } catch (error) {
      toast.error(
        error instanceof AuditXmlDownloadError
          ? error.message
          : 'No se pudo descargar el XML de auditoría.',
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          Descargar XML de auditoría
        </Button>
      </div>

      {/* Decirlo por adelantado evita el clic repetido: el archivo lleva los PDFs adentro, así que
          tarda más que las otras descargas de esta pantalla. */}
      <p className="text-xs text-muted-foreground">
        Incluye el documento original, el firmado y la evidencia de cada firma.
        Puede tardar unos segundos en generarse.
      </p>
    </div>
  );
}
