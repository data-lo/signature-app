import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrentUser } from '@/lib/api/auth';

interface PersonalDocumentsCompletedProps {
  signature: NonNullable<CurrentUser['signature']>;
}

export default function PersonalDocumentsCompleted({ signature }: PersonalDocumentsCompletedProps) {
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
      <CardContent>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signature.secureUrl}
          alt="Firma digital registrada"
          className="h-24 w-full rounded border border-input bg-white object-contain"
        />
      </CardContent>
    </Card>
  );
}
