import {
  computeDropRatio,
  hasCollision,
  signatureBoxRatios,
  type PageSizePt,
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
  /**
   * Tamaño en PUNTOS de la página destino, tal como se ve (con su rotación aplicada). De él sale
   * el tamaño del cuadro: en puntos es constante, así que sus ratios dependen de la hoja. Null
   * mientras el visor no lo haya reportado, y entonces se cae a la referencia A4 vertical.
   */
  pageSize: PageSizePt | null;
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
  pageSize,
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

  /**
   * El cuadro mide lo mismo en puntos en toda hoja, así que sus ratios se calculan contra ESTA
   * página: en una apaisada, el mismo cuadro ocupa menos fracción de ancho y más de alto. Antes
   * eran dos constantes, y por eso la firma salía achatada en horizontal.
   *
   * Los ratios entran también en el cálculo del drop: `computeDropRatio` centra el cuadro en el
   * punto donde se soltó y lo mantiene dentro de la hoja, y las dos cosas dependen de cuánto mide.
   */
  const { widthRatio, heightRatio } = signatureBoxRatios(pageSize);

  const { xRatio, yRatio } = computeDropRatio(
    activeRect,
    containerRect,
    widthRatio,
    heightRatio,
  );
  const candidate = {
    page: pageNumber,
    xRatio,
    yRatio,
    widthRatio,
    heightRatio,
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
