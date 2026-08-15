'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedSignature } from '../_hooks/useAdvancedSignature';

interface AdvancedSignatureViewProps {
  documentId: string;
  collaboratorId: string;
}

/** Renglón etiqueta/valor. Los valores que el backend puede no tener se omiten enteros. */
function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm break-words text-foreground">{value}</span>
    </div>
  );
}

/**
 * Fecha y hora en la zona horaria de quien consulta. El backend la manda en UTC (ISO 8601): se
 * formatea acá y no allá porque quien escanea el QR puede estar en cualquier lado, y una fecha de
 * firma solo es verificable si se lee en una zona conocida — por eso se incluye el nombre de la
 * zona junto a la hora.
 */
function formatSignedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'long',
  }).format(date);
}

/**
 * Constancia de una firma avanzada — la pantalla a la que lleva el código QR estampado en el
 * documento (historia "Generar código QR para firmas avanzadas").
 *
 * La firma avanzada no deja rúbrica visible: su evidencia es criptográfica. Esta pantalla es lo
 * que la hace verificable a simple vista para quien tiene el documento en la mano, sin necesidad
 * de tener cuenta en la plataforma.
 */
export default function AdvancedSignatureView({
  documentId,
  collaboratorId,
}: AdvancedSignatureViewProps) {
  const { data, isLoading, isError } = useAdvancedSignature(
    documentId,
    collaboratorId,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // El backend responde 404 tanto si la firma no existe como si todavía está pendiente: en ambos
  // casos no hay constancia que mostrar, y distinguirlos revelaría si ese colaborador existe.
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Firma no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              El código no corresponde a ninguna firma avanzada registrada, o
              esa firma todavía no se ha completado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Firma electrónica avanzada</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Row label="Firmante" value={data.signerName} />
          <Row label="RFC" value={data.rfc} />
          <Row label="Fecha y hora de firma" value={formatSignedAt(data.signedAt)} />
          <Row label="Documento" value={data.fileName} />
          <Row
            label="Número de serie del certificado"
            value={data.certificateSerialNumber}
          />

          <Link
            href={`/public/documents/${data.documentId}`}
            className="mt-4 text-sm text-emerald-600 underline underline-offset-4 hover:text-emerald-700 dark:text-emerald-400"
          >
            Ver el documento firmado
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
