import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{fileName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          Solicitado por{' '}
          <span className="font-medium text-foreground">{creator}</span>
        </p>
      </CardContent>
    </Card>
  );
}
