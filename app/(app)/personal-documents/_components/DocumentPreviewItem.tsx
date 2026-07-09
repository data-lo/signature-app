'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewItemProps {
  label: string;
  secureUrl: string;
  onDelete: () => void;
  deleting?: boolean;
}

function isImageUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg');
}

export default function DocumentPreviewItem({
  label,
  secureUrl,
  onDelete,
  deleting,
}: DocumentPreviewItemProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={deleting}
          onClick={onDelete}
        >
          Eliminar
        </Button>
      </div>
      {isImageUrl(secureUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={secureUrl}
          alt={`${label} registrada`}
          className="h-24 w-full rounded border border-input bg-muted object-contain"
        />
      ) : (
        <a
          href={secureUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded border border-input bg-muted p-3 text-sm text-primary hover:underline"
        >
          <FileText className="size-5 shrink-0" />
          Ver documento (PDF)
        </a>
      )}
    </div>
  );
}
