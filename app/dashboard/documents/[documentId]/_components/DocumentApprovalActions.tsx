'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
} from '@/lib/enums/document';

import { useDocumentApproval } from '../_hooks/useDocumentApproval';

interface DocumentApprovalActionsProps {
  documentId: string;
  documentStatus: DocumentStatus;
  /** Papel de quien mira el documento (`myRole` del detalle). */
  myRole: ParticipantRole | null;
  /** Su estatus como colaborador (`myStatus` del detalle). */
  myStatus: ParticipantStatus | null;
}

/**
 * "Aprobar" y "Rechazar" para el usuario aprobador (historia "Implementar flujo de aprobación
 * previo al proceso de firma").
 *
 * Las tres condiciones para mostrarlas —ser el revisor asignado, que el documento espere
 * aprobación y que su decisión siga pendiente— se comprueban juntas y aquí dentro. El componente
 * decide si pintarse en vez de recibirlo resuelto porque las tres salen del mismo detalle y
 * repartirlas entre quien lo monta y él haría que se pudieran desincronizar.
 *
 * **Esto es presentación, no autorización.** El backend vuelve a comprobar las tres en cada
 * petición (ver `DocumentApprovalService`): ocultar un botón evita un error, no un acceso.
 */
export default function DocumentApprovalActions({
  documentId,
  documentStatus,
  myRole,
  myStatus,
}: DocumentApprovalActionsProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const { approveMutation, rejectMutation, isDeciding } =
    useDocumentApproval(documentId);

  const canDecide =
    myRole === ParticipantRole.Reviewer &&
    documentStatus === DocumentStatus.PendingApproval &&
    myStatus === ParticipantStatus.Pending;

  if (!canDecide) return null;

  return (
    <section
      aria-labelledby="document-approval-title"
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="document-approval-title"
          className="text-sm font-medium text-foreground"
        >
          Este documento requiere tu aprobación
        </h2>
        <p className="text-sm text-muted-foreground">
          Hasta que lo apruebes, los firmantes no reciben la solicitud ni pueden
          firmarlo.
        </p>
      </div>

      {isRejecting ? (
        <div className="flex flex-col gap-2">
          {/*
            El comentario es opcional —negar la autorización es una decisión válida por sí sola—
            pero se pide antes de confirmar porque es lo único que el creador va a recibir para
            entender qué corregir.
          */}
          <label
            htmlFor="resolutionNote"
            className="text-sm font-medium text-foreground"
          >
            Motivo del rechazo (opcional)
          </label>
          <Textarea
            id="resolutionNote"
            placeholder="Explica qué hay que corregir antes de volver a enviarlo."
            value={resolutionNote}
            onChange={(event) => setResolutionNote(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeciding}
              onClick={() => rejectMutation.mutate(resolutionNote)}
            >
              {rejectMutation.isPending ? 'Rechazando...' : 'Confirmar rechazo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isDeciding}
              onClick={() => setIsRejecting(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={isDeciding}
            onClick={() => approveMutation.mutate()}
          >
            {approveMutation.isPending ? 'Aprobando...' : 'Aprobar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isDeciding}
            onClick={() => setIsRejecting(true)}
          >
            Rechazar
          </Button>
        </div>
      )}
    </section>
  );
}
