import {
  clampBoxPosition,
  boxesOverlap,
  hasCollision,
  computeDropRatio,
  SIGNATURE_BOX_WIDTH_RATIO,
  SIGNATURE_BOX_HEIGHT_RATIO,
  type PlacedBox,
} from './signature-geometry';

describe('clampBoxPosition', () => {
  it('deja sin cambios una posición ya válida', () => {
    expect(clampBoxPosition(0.3, 0.4)).toEqual({ xRatio: 0.3, yRatio: 0.4 });
  });

  it('clampa valores negativos a 0', () => {
    expect(clampBoxPosition(-0.1, -5)).toEqual({ xRatio: 0, yRatio: 0 });
  });

  it('clampa valores cerca de 1 a 1 - widthRatio/heightRatio, para que el cuadro quede 100% dentro de la página', () => {
    expect(clampBoxPosition(0.99, 0.99)).toEqual({
      xRatio: 1 - SIGNATURE_BOX_WIDTH_RATIO,
      yRatio: 1 - SIGNATURE_BOX_HEIGHT_RATIO,
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
    const touchingRight: PlacedBox = { ...base, id: 'b', xRatio: 0.4, yRatio: 0.2 };
    expect(boxesOverlap(base, touchingRight)).toBe(false);
  });

  it('no hay colisión entre cajas lejanas', () => {
    const farAway: PlacedBox = { ...base, id: 'b', xRatio: 0.8, yRatio: 0.8 };
    expect(boxesOverlap(base, farAway)).toBe(false);
  });
});

describe('hasCollision', () => {
  const others: PlacedBox[] = [
    { id: 'existing-1', page: 1, xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.08 },
    { id: 'existing-2', page: 2, xRatio: 0.1, yRatio: 0.1, widthRatio: 0.2, heightRatio: 0.08 },
  ];

  it('ignora cajas de otra página', () => {
    const candidate = { page: 2, xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.08 };
    expect(hasCollision(candidate, others)).toBe(false);
  });

  it('detecta colisión con una caja de la misma página', () => {
    const candidate = { page: 1, xRatio: 0.55, yRatio: 0.52, widthRatio: 0.2, heightRatio: 0.08 };
    expect(hasCollision(candidate, others)).toBe(true);
  });

  it('excluye la propia caja por id (para poder moverla sin chocar consigo misma)', () => {
    const candidate = { page: 1, xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.08 };
    expect(hasCollision(candidate, others, 'existing-1')).toBe(false);
  });

  it('sin otras cajas, nunca hay colisión', () => {
    const candidate = { page: 1, xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.08 };
    expect(hasCollision(candidate, [])).toBe(false);
  });
});

describe('computeDropRatio', () => {
  it('centra el candidato bajo el centro del elemento arrastrado, relativo al contenedor', () => {
    const containerRect = { left: 0, top: 0, width: 1000, height: 2000 };
    // Centro del elemento arrastrado en (500, 1000) → 50% / 50% del contenedor.
    const activeRect = { left: 480, top: 980, width: 40, height: 40 };

    const result = computeDropRatio(activeRect, containerRect);

    expect(result.xRatio).toBeCloseTo(0.5 - SIGNATURE_BOX_WIDTH_RATIO / 2);
    expect(result.yRatio).toBeCloseTo(0.5 - SIGNATURE_BOX_HEIGHT_RATIO / 2);
  });

  it('clampa el resultado cuando el centro cae cerca del borde (el cuadro no puede salirse de la página)', () => {
    const containerRect = { left: 0, top: 0, width: 1000, height: 1000 };
    // Centro casi en la esquina inferior derecha del contenedor.
    const activeRect = { left: 990, top: 990, width: 20, height: 20 };

    const result = computeDropRatio(activeRect, containerRect);

    expect(result.xRatio).toBeCloseTo(1 - SIGNATURE_BOX_WIDTH_RATIO);
    expect(result.yRatio).toBeCloseTo(1 - SIGNATURE_BOX_HEIGHT_RATIO);
  });

  it('respeta un widthRatio/heightRatio distinto al default cuando se pasa explícito', () => {
    const containerRect = { left: 0, top: 0, width: 100, height: 100 };
    const activeRect = { left: 45, top: 45, width: 10, height: 10 };

    const result = computeDropRatio(activeRect, containerRect, 0.4, 0.4);

    expect(result.xRatio).toBeCloseTo(0.5 - 0.2);
    expect(result.yRatio).toBeCloseTo(0.5 - 0.2);
  });
});
