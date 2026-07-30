import {
  computeDropRatio,
  hasCollision,
  SIGNATURE_BOX_WIDTH_RATIO,
  SIGNATURE_BOX_HEIGHT_RATIO,
  type PlacedBox,
  type RectLike,
} from '@/lib/signature-geometry';
import type { CollaboratorFormValues, SignaturePosition } from '../_schemas';

/**
 * Distingue de dónde vino el drag: `chip` es el ícono del panel lateral (siempre AGREGA una
 * entrada nueva al arreglo del firmante, nunca sobreescribe — Escenario 4 de la historia); `box`
 * es una firma ya colocada que se está moviendo (ACTUALIZA esa entrada por `signatureId`).
 */
export type SignatureDragPayload =
  | { type: 'chip'; collaboratorIndex: number }
  | { type: 'box'; collaboratorIndex: number; signatureId: string };

export interface ResolveSignatureDropParams {
  dragPayload: SignatureDragPayload;
  /** Página sobre la que se soltó, o null si se soltó fuera de cualquier página (`event.over` nulo). */
  pageNumber: number | null;
  /** Rect (viewport) del elemento arrastrado en el momento de soltar — `active.rect.current.translated`. */
  activeRect: RectLike | null;
  /** Rect (viewport) de la página destino — `event.over.rect`. */
  containerRect: RectLike | null;
  collaborators: CollaboratorFormValues[];
  /** Generador de id para una entrada nueva — inyectado para que el test no dependa de crypto.randomUUID. */
  createId: () => string;
}

export type ResolveSignatureDropResult =
  | { outcome: 'noop' }
  | { outcome: 'rejected' }
  | {
      outcome: 'committed';
      collaboratorIndex: number;
      signatures: SignaturePosition[];
    };

/**
 * Decisión pura de qué hacer al soltar una firma — sin dnd-kit ni React, para poder testear los
 * 4 desenlaces (agrega, mueve, rechaza por colisión, noop) con objetos planos. Ver historia
 * "Ubicación de firmas por usuario", Escenarios 1-6.
 */
export function resolveSignatureDrop({
  dragPayload,
  pageNumber,
  activeRect,
  containerRect,
  collaborators,
  createId,
}: ResolveSignatureDropParams): ResolveSignatureDropResult {
  if (pageNumber == null || activeRect == null || containerRect == null) {
    return { outcome: 'noop' };
  }

  const signer = collaborators[dragPayload.collaboratorIndex];
  if (!signer || signer.collaboratorType !== 'SIGNER') {
    return { outcome: 'noop' };
  }

  const { xRatio, yRatio } = computeDropRatio(activeRect, containerRect);
  const candidate = {
    page: pageNumber,
    xRatio,
    yRatio,
    widthRatio: SIGNATURE_BOX_WIDTH_RATIO,
    heightRatio: SIGNATURE_BOX_HEIGHT_RATIO,
  };

  // Colisión contra TODAS las firmas ya colocadas (de cualquier firmante) en esa página —
  // Escenario 2 de la historia. Al mover una caja existente, se excluye a sí misma.
  const allPositions: PlacedBox[] = collaborators.flatMap((c) =>
    c.collaboratorType === 'SIGNER' ? c.signatures : [],
  );
  const excludeId =
    dragPayload.type === 'box' ? dragPayload.signatureId : undefined;

  if (hasCollision(candidate, allPositions, excludeId)) {
    return { outcome: 'rejected' };
  }

  if (dragPayload.type === 'chip') {
    return {
      outcome: 'committed',
      collaboratorIndex: dragPayload.collaboratorIndex,
      signatures: [...signer.signatures, { id: createId(), ...candidate }],
    };
  }

  return {
    outcome: 'committed',
    collaboratorIndex: dragPayload.collaboratorIndex,
    signatures: signer.signatures.map((position) =>
      position.id === dragPayload.signatureId
        ? { ...position, ...candidate }
        : position,
    ),
  };
}
