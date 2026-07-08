import { CheckCircle2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentUser } from '@/lib/api/auth';

interface PersonalDocumentsCompletedProps {
  signature: NonNullable<CurrentUser['signature']>;
  officialFile: NonNullable<CurrentUser['officialFile']>;
}

function isImageUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg');
}

export default function PersonalDocumentsCompleted({
  signature,
  officialFile,
}: PersonalDocumentsCompletedProps) {
  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-500" />
          Documentos personales completos
        </CardTitle>
        <CardDescription>
          Ya registraste tu identificación oficial y tu firma digital.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">Identificación (INE)</p>
          {isImageUrl(officialFile.secureUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={officialFile.secureUrl}
              alt="Identificación oficial registrada"
              className="h-24 w-full rounded border border-input bg-white object-contain"
            />
          ) : (
            <a
              href={officialFile.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded border border-input bg-white p-3 text-sm text-primary hover:underline"
            >
              <FileText className="size-5 shrink-0" />
              Ver identificación (PDF)
            </a>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">Firma digital</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signature.secureUrl}
            alt="Firma digital registrada"
            className="h-24 w-full rounded border border-input bg-white object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
