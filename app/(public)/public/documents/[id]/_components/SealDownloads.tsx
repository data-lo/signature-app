import { Download } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  sealArtifactDownloadUrl,
  type PublicSealDownloads,
  type SealArtifact,
} from '../_requests';

/**
 * Cómo se rotula cada artefacto del sello del PSC.
 *
 * `canonical` se llama "Cadena canónica" y no "XML canónico" como lo nombra la historia: lo que
 * Seal Service sella y devuelve NO es XML, sino segmentos con su longitud en bytes al frente
 * unidos por `||` (ver su `seal.service.ts`), y se descarga como `.txt`. Ponerle "XML" al botón
 * haría que quien lo abra crea que el archivo está corrupto. Si el producto quiere XML de verdad,
 * el cambio es de Seal Service.
 */
const ARTIFACT_LABELS: Record<SealArtifact, string> = {
  nom151: 'Constancia NOM-151',
  timestamp: 'Sello de tiempo',
  canonical: 'Cadena canónica',
};

const ARTIFACT_ORDER: SealArtifact[] = ['nom151', 'timestamp', 'canonical'];

/**
 * Descargas de la constancia del PSC de un documento completado.
 *
 * Son enlaces normales, no botones con JavaScript: el backend responde con
 * `Content-Disposition: attachment`, así que el navegador guarda el archivo solo. Cada uno se
 * pinta solo si el backend confirmó que ese artefacto existe — un documento de firma simple no
 * tiene sello, y el sellado es best-effort incluso en los avanzados.
 */
export function SealDownloads({
  documentId,
  downloads,
}: {
  documentId: string;
  downloads: PublicSealDownloads;
}) {
  const available = ARTIFACT_ORDER.filter((artifact) => downloads[artifact]);

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este documento no tiene constancia de conservación descargable.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((artifact) => (
        <a
          key={artifact}
          href={sealArtifactDownloadUrl(documentId, artifact)}
          download
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Download className="size-3.5" aria-hidden />
          {ARTIFACT_LABELS[artifact]}
        </a>
      ))}
    </div>
  );
}
