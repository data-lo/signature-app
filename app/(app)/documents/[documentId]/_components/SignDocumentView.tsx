'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { rejectDocumentSchema, type RejectDocumentFormValues } from '../_schemas';
import type { ParticipantStatus } from '../_requests';

const PdfPreview = dynamic(() => import('../../_components/PdfPreview'), { ssr: false });

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  pending: 'Pendiente',
  signed: 'Firmado',
  rejected: 'Rechazado',
};

interface SignDocumentViewProps {
  documentId: string;
}

export default function SignDocumentView({ documentId }: SignDocumentViewProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const { data: document, isLoading, isError } = useDocumentDetail(documentId);
  const signMutation = useSignDocument(documentId);
  const rejectMutation = useRejectDocument(documentId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectDocumentFormValues>({
    resolver: zodResolver(rejectDocumentSchema),
  });

  function onReject(values: RejectDocumentFormValues) {
    rejectMutation.mutate(values.reason);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando documento...
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-destructive">No se pudo cargar el documento. Intenta de nuevo más tarde.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-8 py-8 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{document.fileName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              Solicitado por <span className="font-medium text-foreground">{document.creator}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Participantes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {document.participants.map((participant) => (
              <div key={participant.userId} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{participant.name}</span>
                  <span
                    className={
                      participant.status === 'signed'
                        ? 'text-emerald-600'
                        : participant.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-600'
                    }
                  >
                    {STATUS_LABELS[participant.status]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {participant.role === 'signer' ? 'Firmante' : 'Espectador'}
                </span>
                {participant.rejectionReason && (
                  <p className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                    {participant.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {document.canSign && !showRejectForm && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={signMutation.isPending}
              onClick={() => signMutation.mutate()}
            >
              {signMutation.isPending ? 'Firmando...' : 'Continuar a firmar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowRejectForm(true)}>
              Rechazar documento
            </Button>
          </div>
        )}

        {document.canReject && showRejectForm && (
          <form onSubmit={handleSubmit(onReject)} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">¿Cuál es el problema con el documento?</p>
            <Textarea
              placeholder="Explica detalladamente por qué rechazas este documento."
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowRejectForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {!document.canSign && document.myStatus && (
          <p className="text-sm text-muted-foreground">
            {document.myStatus === 'signed'
              ? 'Ya firmaste este documento.'
              : document.myStatus === 'rejected'
                ? 'Ya rechazaste este documento.'
                : 'Aún no es tu turno para firmar este documento.'}
          </p>
        )}
      </div>

      <Card className="h-[75vh] overflow-hidden p-0">
        <CardContent className="h-full p-0">
          <PdfPreview file={document.secureUrl} />
        </CardContent>
      </Card>
    </main>
  );
}
