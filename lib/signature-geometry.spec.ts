import {
  clampBoxPosition,
  boxesOverlap,
  hasCollision,
  computeDropRatio,
  signatureBoxRatios,
  SIGNATURE_BOX_SIZE_PT,
  type PlacedBox,
} from './signature-geometry';

/**
 * Los ratios del cuadro sobre la hoja de referencia (A4 vertical). Son los que las funciones usan
 * por defecto, y valen exactamente los 0.2 x 0.08 que antes eran constantes.
 */
const REFERENCE = signatureBoxRatios(null);

describe('clampBoxPosition', () => {
  it('deja sin cambios una posición ya válida', () => {
    expect(clampBoxPosition(0.3, 0.4)).toEqual({ xRatio: 0.3, yRatio: 0.4 });
  });

  it('clampa valores negativos a 0', () => {
    expect(clampBoxPosition(-0.1, -5)).toEqual({ xRatio: 0, yRatio: 0 });
  });

  it('clampa valores cerca de 1 a 1 - widthRatio/heightRatio, para que el cuadro quede 100% dentro de la página', () => {
    expect(clampBoxPosition(0.99, 0.99)).toEqual({
      xRatio: 1 - REFERENCE.widthRatio,
      yRatio: 1 - REFERENCE.heightRatio,
    });
  });
});

describe('boxesOverlap', () => {
  const base: PlacedBox = {
    id: 'a',
    page: 1,
    xRatio: 0.2,
    yRatio: 0.2,
    widthRatio: 0.2,
    heightRatio: 0.1,
  };

  it('detecta colisión cuando los centros se solapan', () => {
    const other: PlacedBox = { ...base, id: 'b', xRatio: 0.25, yRatio: 0.22 };
    expect(boxesOverlap(base, other)).toBe(true);
  });

  it('no cuenta como colisión cuando los bordes solo se tocan', () => {
    const touchingRight: PlacedBox = {
      ...base,
      id: 'b',
      xRatio: 0.4,
      yRatio: 0.2,
    };
    expect(boxesOverlap(base, touchingRight)).toBe(false);
  });

  it('no hay colisión entre cajas lejanas', () => {
    const farAway: PlacedBox = { ...base, id: 'b', xRatio: 0.8, yRatio: 0.8 };
    expect(boxesOverlap(base, farAway)).toBe(false);
  });
});

describe('hasCollision', () => {
  const others: PlacedBox[] = [
    {
      id: 'existing-1',
      page: 1,
      xRatio: 0.5,
      yRatio: 0.5,
      widthRatio: 0.2,
      heightRatio: 0.08,
    },
    {
      id: 'existing-2',
      page: 2,
      xRatio: 0.1,
      yRatio: 0.1,
      widthRatio: 0.2,
      heightRatio: 0.08,
    },
  ];

  it('ignora cajas de otra página', () => {
    const candidate = {
      page: 2,
      xRatio: 0.5,
      yRatio: 0.5,
      widthRatio: 0.2,
      heightRatio: 0.08,
    };
    expect(hasCollision(candidate, others)).toBe(false);
  });

  it('detecta colisión con una caja de la misma página', () => {
    const candidate = {
      page: 1,
      xRatio: 0.55,
      yRatio: 0.52,
      widthRatio: 0.2,
      heightRatio: 0.08,
    };
    expect(hasCollision(candidate, others)).toBe(true);
  });

  it('excluye la propia caja por id (para poder moverla sin chocar consigo misma)', () => {
    const candidate = {
      page: 1,
      xRatio: 0.5,
      yRatio: 0.5,
      widthRatio: 0.2,
      heightRatio: 0.08,
    };
    expect(hasCollision(candidate, others, 'existing-1')).toBe(false);
  });

  it('sin otras cajas, nunca hay colisión', () => {
    const candidate = {
      page: 1,
      xRatio: 0.5,
      yRatio: 0.5,
      widthRatio: 0.2,
      heightRatio: 0.08,
    };
    expect(hasCollision(candidate, [])).toBe(false);
  });
});

describe('computeDropRatio', () => {
  it('centra el candidato bajo el centro del elemento arrastrado, relativo al contenedor', () => {
    const containerRect = { left: 0, top: 0, width: 1000, height: 2000 };
    // Centro del elemento arrastrado en (500, 1000) → 50% / 50% del contenedor.
    const activeRect = { left: 480, top: 980, width: 40, height: 40 };

    const result = computeDropRatio(activeRect, containerRect);

    expect(result.xRatio).toBeCloseTo(0.5 - REFERENCE.widthRatio / 2);
    expect(result.yRatio).toBeCloseTo(0.5 - REFERENCE.heightRatio / 2);
  });

  it('clampa el resultado cuando el centro cae cerca del borde (el cuadro no puede salirse de la página)', () => {
    const containerRect = { left: 0, top: 0, width: 1000, height: 1000 };
    // Centro casi en la esquina inferior derecha del contenedor.
    const activeRect = { left: 990, top: 990, width: 20, height: 20 };

    const result = computeDropRatio(activeRect, containerRect);

    expect(result.xRatio).toBeCloseTo(1 - REFERENCE.widthRatio);
    expect(result.yRatio).toBeCloseTo(1 - REFERENCE.heightRatio);
  });

  it('respeta un widthRatio/heightRatio distinto al default cuando se pasa explícito', () => {
    const containerRect = { left: 0, top: 0, width: 100, height: 100 };
    const activeRect = { left: 45, top: 45, width: 10, height: 10 };

    const result = computeDropRatio(activeRect, containerRect, 0.4, 0.4);

    expect(result.xRatio).toBeCloseTo(0.5 - 0.2);
    expect(result.yRatio).toBeCloseTo(0.5 - 0.2);
  });
});

/**
 * El cuadro de firma era un porcentaje fijo de la página (20% x 8%), y por eso la misma firma se
 * veía distinta según la orientación: en A4 vertical daba 1.77:1 y en A4 apaisado 3.54:1. Como la
 * rúbrica se estampa llenando el cuadro, en horizontal quedaba achatada.
 *
 * Ahora el cuadro se define en puntos y son los ratios los que se calculan por página.
 */
describe('signatureBoxRatios', () => {
  const A4_PORTRAIT = { width: 595.28, height: 841.89 };
  const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

  /** El caso dominante tiene que quedar donde estaba: los ratios de referencia son 0.2 x 0.08. */
  it('en A4 vertical devuelve los ratios fijos de siempre', () => {
    const { widthRatio, heightRatio } = signatureBoxRatios(A4_PORTRAIT);

    expect(widthRatio).toBeCloseTo(0.2, 6);
    expect(heightRatio).toBeCloseTo(0.08, 6);
  });

  /** El arreglo: mismo tamaño físico, luego misma forma, en las dos orientaciones. */
  it('conserva la proporción del cuadro al girar la hoja', () => {
    const vertical = signatureBoxRatios(A4_PORTRAIT);
    const apaisada = signatureBoxRatios(A4_LANDSCAPE);

    const proporcion = (
      { widthRatio, heightRatio }: { widthRatio: number; heightRatio: number },
      page: { width: number; height: number },
    ) => (widthRatio * page.width) / (heightRatio * page.height);

    expect(proporcion(apaisada, A4_LANDSCAPE)).toBeCloseTo(
      proporcion(vertical, A4_PORTRAIT),
      6,
    );
  });

  it('conserva el tamaño en puntos en cualquier hoja', () => {
    for (const page of [
      A4_PORTRAIT,
      A4_LANDSCAPE,
      { width: 612, height: 792 }, // Carta vertical
      { width: 1224, height: 792 }, // Tabloide apaisado
    ]) {
      const { widthRatio, heightRatio } = signatureBoxRatios(page);

      expect(widthRatio * page.width).toBeCloseTo(
        SIGNATURE_BOX_SIZE_PT.width,
        6,
      );
      expect(heightRatio * page.height).toBeCloseTo(
        SIGNATURE_BOX_SIZE_PT.height,
        6,
      );
    }
  });

  /** En una hoja diminuta el tamaño físico no cabe: sin tope, el cuadro se saldría de la página. */
  it('no deja que el cuadro se salga de una hoja más chica que él', () => {
    const { widthRatio, heightRatio } = signatureBoxRatios({
      width: 80,
      height: 40,
    });

    expect(widthRatio).toBeLessThanOrEqual(0.9);
    expect(heightRatio).toBeLessThanOrEqual(0.9);
  });

  /** Mientras el visor no reportó la hoja, se usa la referencia: lo que el cuadro medía antes. */
  it.each([
    ['sin página', null],
    ['sin dimensiones', { width: 0, height: 0 }],
  ])('cae a la referencia A4 vertical %s', (_caso, page) => {
    expect(signatureBoxRatios(page)).toEqual(signatureBoxRatios(A4_PORTRAIT));
  });
});
