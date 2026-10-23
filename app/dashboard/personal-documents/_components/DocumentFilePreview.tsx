'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ExternalLink, FileQuestion, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

// react-pdf necesita el DOM (canvas), así que igual que en el módulo de documentos se carga solo
// en cliente. Se reutiliza el mismo visor de las pantallas de documentos en vez de duplicarlo.
const PdfPreview = dynamic(
  () => import('@/app/dashboard/documents/_components/PdfPreview'),
  { ssr: false },
);

/**
 * El archivo a previsualizar: un `File` recién elegido en el dropzone (todavía sin guardar) o la
 * URL prefirmada del documento ya almacenado. `null` es el estado vacío, antes de elegir nada.
 */
export type DocumentPreviewSource = File | string | null;

interface DocumentFilePreviewProps {
  source: DocumentPreviewSource;
  /** Nombre del documento; se usa en el texto alternativo de la imagen. */
  label: string;
  /** Qué mostrar mientras no hay archivo (ni elegido ni guardado). */
  emptyMessage: string;
  className?: string;
}

type PreviewKind = 'image' | 'pdf' | 'unknown';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/** La URL prefirmada de MinIO trae la query de la firma: el tipo se decide solo por su ruta. */
function resolveUrlKind(url: string): PreviewKind {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (IMAGE_EXTENSIONS.some((extension) => path.endsWith(extension))) {
    return 'image';
  }
  return 'unknown';
}

function resolveKind(source: File | string): PreviewKind {
  if (typeof source === 'string') return resolveUrlKind(source);
  if (source.type === 'application/pdf') return 'pdf';
  if (source.type.startsWith('image/')) return 'image';
  return 'unknown';
}

/**
 * Previsualización de un documento personal, con el mismo aspecto antes y después de guardarlo:
 * el archivo elegido en el dropzone se muestra desde un object URL local (sin subirlo) y el ya
 * guardado desde su URL prefirmada. Los PDF se renderizan con el visor de páginas y las imágenes
 * a tamaño contenido; el contenedor tiene altura fija para que la tarjeta no salte al pasar de
 * un estado a otro.
 */
export default function DocumentFilePreview({
  source,
  label,
  emptyMessage,
  className,
}: DocumentFilePreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Solo los archivos locales necesitan un object URL; el guardado ya viene como URL. Se revoca
    // al cambiar de archivo o al desmontar para no filtrar el blob.
    if (!(source instanceof File)) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(source);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);

  const kind = source === null ? null : resolveKind(source);
  // El object URL de un archivo local solo existe después del efecto: hasta entonces no hay nada
  // que pintar (renderizar la imagen con `src=""` haría al navegador recargar la propia página).
  const imageSrc = typeof source === 'string' ? source : objectUrl;

  return (
    <div
      className={cn(
        'h-[420px] overflow-hidden rounded-lg border border-input bg-muted/40',
        className,
      )}
    >
      {source === null && (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <UploadCloud className="size-8 opacity-60" />
          {emptyMessage}
        </div>
      )}

      {source !== null && kind === 'pdf' && <PdfPreview file={source} />}

      {source !== null && kind === 'image' && imageSrc !== null && (
        <div className="flex h-full items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={`Previsualización de ${label}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {source !== null && kind === 'unknown' && (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <FileQuestion className="size-8 opacity-60" />
          No se puede previsualizar este formato.
          {typeof source === 'string' && (
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="size-4" />
              Abrir en una pestaña nueva
            </a>
          )}
        </div>
      )}
    </div>
  );
}
