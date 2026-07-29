/**
 * Matemática pura de posicionamiento de cuadros de firma (ver historia "Ubicación de firmas por
 * usuario") — sin React ni dnd-kit, para poder testear colisión/clamping con objetos planos.
 * Mismo algoritmo de overlap que su espejo en el backend
 * (`signature-server/src/document/utils/signature-collision.util.ts`), duplicado a propósito:
 * son dos repos/lenguajes distintos sin paquete compartido, y es lo bastante pequeño para no
 * justificar la complejidad de sincronizarlo entre ambos.
 */

export const SIGNATURE_BOX_WIDTH_RATIO = 0.2 as const;
export const SIGNATURE_BOX_HEIGHT_RATIO = 0.08 as const;

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Box {
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

export interface PlacedBox extends Box {
  id: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clampa para que el cuadro (tamaño fijo) quede 100% dentro de la página — Escenario 3 de la historia. */
export function clampBoxPosition(
  xRatio: number,
  yRatio: number,
  widthRatio: number = SIGNATURE_BOX_WIDTH_RATIO,
  heightRatio: number = SIGNATURE_BOX_HEIGHT_RATIO,
): { xRatio: number; yRatio: number } {
  return {
    xRatio: clamp(xRatio, 0, 1 - widthRatio),
    yRatio: clamp(yRatio, 0, 1 - heightRatio),
  };
}

/**
 * AABB (axis-aligned bounding box) overlap estricto — bordes que solo se tocan
 * (`a.xRatio + a.widthRatio === b.xRatio`) NO cuentan como colisión.
 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.xRatio < b.xRatio + b.widthRatio &&
    a.xRatio + a.widthRatio > b.xRatio &&
    a.yRatio < b.yRatio + b.heightRatio &&
    a.yRatio + a.heightRatio > b.yRatio
  );
}

/** Escenario 2 de la historia: colisión contra otras cajas de la MISMA página, excluyendo la propia (para mover). */
export function hasCollision(
  candidate: Box,
  othersOnSamePage: PlacedBox[],
  excludeId?: string,
): boolean {
  return othersOnSamePage
    .filter((box) => box.page === candidate.page && box.id !== excludeId)
    .some((box) => boxesOverlap(candidate, box));
}

/**
 * Centro del rect arrastrado (viewport) → ratio relativo al rect de la página (viewport) →
 * clampado. Usar el CENTRO (no la esquina superior-izquierda) hace que no importe si lo que se
 * arrastra es un chip pequeño o una caja del tamaño real: el centro del elemento arrastrado se
 * vuelve el centro de la caja resultante.
 */
export function computeDropRatio(
  activeRect: RectLike,
  containerRect: RectLike,
  widthRatio: number = SIGNATURE_BOX_WIDTH_RATIO,
  heightRatio: number = SIGNATURE_BOX_HEIGHT_RATIO,
): { xRatio: number; yRatio: number } {
  const centerX = activeRect.left + activeRect.width / 2;
  const centerY = activeRect.top + activeRect.height / 2;
  const rawX = (centerX - containerRect.left) / containerRect.width - widthRatio / 2;
  const rawY = (centerY - containerRect.top) / containerRect.height - heightRatio / 2;
  return clampBoxPosition(rawX, rawY, widthRatio, heightRatio);
}
