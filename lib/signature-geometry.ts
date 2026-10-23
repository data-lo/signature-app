/**
 * Matemática pura de posicionamiento de cuadros de firma (ver historia "Ubicación de firmas por
 * usuario") — sin React ni dnd-kit, para poder testear colisión/clamping con objetos planos.
 * Mismo algoritmo de overlap que su espejo en el backend
 * (`signature-server/src/document/utils/signature-collision.util.ts`), duplicado a propósito:
 * son dos repos/lenguajes distintos sin paquete compartido, y es lo bastante pequeño para no
 * justificar la complejidad de sincronizarlo entre ambos.
 */

/**
 * Tamaño FÍSICO del cuadro de firma, en puntos PDF.
 *
 * Era un porcentaje fijo de la página (20% de ancho por 8% de alto), y ese es el motivo de que la
 * misma firma se viera distinta según la orientación: en A4 vertical el cuadro salía de 119x67pt
 * (proporción 1.77:1) y en A4 apaisado de 168x48pt (3.54:1). La rúbrica se estampa llenando el
 * cuadro, así que en horizontal quedaba achatada — el mismo firmante, en dos hojas del mismo
 * documento, con dos firmas de forma distinta.
 *
 * Una firma es un objeto físico: no crece porque el papel sea más grande ni se aplasta porque sea
 * apaisado. De ahí que el cuadro se defina en puntos y sean los RATIOS los que se calculen por
 * página (ver `signatureBoxRatios`), y no al revés.
 *
 * El valor sale de la referencia histórica —el 20% x 8% de una hoja A4 vertical— para que el caso
 * dominante siga colocándose exactamente igual que antes de este cambio.
 */
const A4_PORTRAIT_PT = { width: 595.28, height: 841.89 } as const;

export const SIGNATURE_BOX_SIZE_PT = {
  width: A4_PORTRAIT_PT.width * 0.2,
  height: A4_PORTRAIT_PT.height * 0.08,
} as const;

/**
 * Fracción máxima de la página que puede ocupar el cuadro.
 *
 * Sólo entra en juego en hojas diminutas (un ticket, una etiqueta), donde el tamaño físico no
 * cabría. Sin el tope, `widthRatio` pasaría de 1 y el cuadro se saldría de la hoja.
 */
const MAX_BOX_RATIO = 0.9;

/** Tamaño en puntos de una página TAL COMO SE VE (con la rotación del PDF ya aplicada). */
export interface PageSizePt {
  width: number;
  height: number;
}

/**
 * Ratios del cuadro de firma para una página concreta, a partir de su tamaño real.
 *
 * En una A4 vertical devuelve 0.2 x 0.08 —los valores fijos de antes—, y en cualquier otra hoja
 * devuelve los que conservan el mismo tamaño físico. Los ratios siguen siendo lo que se persiste:
 * el contrato con el backend no cambia, sólo deja de asumir que todas las páginas son verticales.
 *
 * Sin un tamaño de página (el PDF todavía no cargó) cae a la referencia A4 vertical, que es lo que
 * el cuadro medía antes en cualquier hoja.
 */
export function signatureBoxRatios(page?: PageSizePt | null): {
  widthRatio: number;
  heightRatio: number;
} {
  const { width, height } = page ?? A4_PORTRAIT_PT;

  if (!(width > 0) || !(height > 0)) {
    return signatureBoxRatios(A4_PORTRAIT_PT);
  }

  return {
    widthRatio: Math.min(SIGNATURE_BOX_SIZE_PT.width / width, MAX_BOX_RATIO),
    heightRatio: Math.min(SIGNATURE_BOX_SIZE_PT.height / height, MAX_BOX_RATIO),
  };
}

/**
 * Ratios de la referencia A4 vertical. Es el valor por defecto de las funciones de abajo, que se
 * usa mientras el visor todavía no reportó el tamaño de la página.
 */
const DEFAULT_BOX_RATIOS = signatureBoxRatios(A4_PORTRAIT_PT);

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
  widthRatio: number = DEFAULT_BOX_RATIOS.widthRatio,
  heightRatio: number = DEFAULT_BOX_RATIOS.heightRatio,
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
  widthRatio: number = DEFAULT_BOX_RATIOS.widthRatio,
  heightRatio: number = DEFAULT_BOX_RATIOS.heightRatio,
): { xRatio: number; yRatio: number } {
  const centerX = activeRect.left + activeRect.width / 2;
  const centerY = activeRect.top + activeRect.height / 2;
  const rawX =
    (centerX - containerRect.left) / containerRect.width - widthRatio / 2;
  const rawY =
    (centerY - containerRect.top) / containerRect.height - heightRatio / 2;
  return clampBoxPosition(rawX, rawY, widthRatio, heightRatio);
}
