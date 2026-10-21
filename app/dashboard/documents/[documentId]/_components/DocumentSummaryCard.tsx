import { FileText } from 'lucide-react';

interface DocumentSummaryCardProps {
  fileName: string;
  creator: string;
}

/** Encabezado del detalle: qué documento es y quién lo solicitó. */
export default function DocumentSummaryCard({
  fileName,
  creator,
}: DocumentSummaryCardProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-foreground" title={fileName}>
          {fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          Solicitado por{' '}
          <span className="font-medium text-foreground">{creator}</span>
        </p>
      </div>
    </div>
  );
}
