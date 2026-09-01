import { resolveSignatureDrop } from './resolveSignatureDrop';
import {
  emptySigner,
  emptyViewer,
  type CollaboratorFormValues,
} from '../_schemas';

const CONTAINER_RECT = { left: 0, top: 0, width: 1000, height: 1000 };

/**
 * A4 vertical en puntos. Es la hoja de referencia del cuadro de firma: sobre ella los ratios dan
 * exactamente 0.2 x 0.08, los valores fijos que el cuadro tenía antes de calcularse por página.
 */
const A4_PORTRAIT = { width: 595.28, height: 841.89 };

/** La misma hoja girada: mismo cuadro en puntos, ratios distintos. */
const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

function signerWith(
  overrides: Partial<ReturnType<typeof emptySigner>> = {},
): CollaboratorFormValues {
  return {
    ...emptySigner(),
    firstName: 'Ana',
    lastName: 'Gómez',
    ...overrides,
  };
}

describe('resolveSignatureDrop', () => {
  it('agrega una nueva entrada al soltar un chip sobre una página válida, sin tocar entradas existentes', () => {
    const collaborators = [
      signerWith({
        signatures: [
          {
            id: 'existing-1',
            page: 1,
            xRatio: 0.1,
            yRatio: 0.1,
            widthRatio: 0.2,
            heightRatio: 0.08,
          },
        ],
      }),
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: 2,
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize: A4_PORTRAIT,
      collaborators,
      createId: () => 'new-id',
    });

    expect(result.outcome).toBe('committed');
    if (result.outcome !== 'committed') throw new Error('expected committed');
    expect(result.collaboratorIndex).toBe(0);
    expect(result.signatures).toHaveLength(2);
    expect(result.signatures[0]).toEqual({
      id: 'existing-1',
      page: 1,
      xRatio: 0.1,
      yRatio: 0.1,
      widthRatio: 0.2,
      heightRatio: 0.08,
    });
    expect(result.signatures[1]).toMatchObject({ id: 'new-id', page: 2 });
  });

  it('rechaza si la posición candidata colisiona con una firma existente de OTRO firmante en la misma página', () => {
    const collaborators = [
      signerWith({
        email: 'a@correo.com',
        signatures: [
          {
            id: 'existing-1',
            page: 1,
            xRatio: 0.4,
            yRatio: 0.4,
            widthRatio: 0.2,
            heightRatio: 0.08,
          },
        ],
      }),
      signerWith({ email: 'b@correo.com', signatures: [] }),
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 1 },
      pageNumber: 1,
      // Centro cae dentro del rango de la firma existente (0.4-0.6 en x e y).
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize: A4_PORTRAIT,
      collaborators,
      createId: () => 'new-id',
    });

    expect(result.outcome).toBe('rejected');
  });

  it('actualiza (no agrega) al mover una caja existente por su id, sin chocar consigo misma', () => {
    const collaborators = [
      signerWith({
        signatures: [
          {
            id: 'existing-1',
            page: 1,
            xRatio: 0.1,
            yRatio: 0.1,
            widthRatio: 0.2,
            heightRatio: 0.08,
          },
        ],
      }),
    ];

    const result = resolveSignatureDrop({
      dragPayload: {
        type: 'box',
        collaboratorIndex: 0,
        signatureId: 'existing-1',
      },
      pageNumber: 1,
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize: A4_PORTRAIT,
      collaborators,
      createId: () => 'should-not-be-used',
    });

    expect(result.outcome).toBe('committed');
    if (result.outcome !== 'committed') throw new Error('expected committed');
    expect(result.signatures).toHaveLength(1);
    expect(result.signatures[0].id).toBe('existing-1');
    expect(result.signatures[0].page).toBe(1);
    expect(result.signatures[0].xRatio).toBeCloseTo(0.4);
  });

  it('no hace nada si se suelta fuera de cualquier página (pageNumber null)', () => {
    const collaborators = [signerWith()];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: null,
      activeRect: { left: 0, top: 0, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize: A4_PORTRAIT,
      collaborators,
      createId: () => 'new-id',
    });

    expect(result).toEqual({ outcome: 'noop' });
  });

  it('no hace nada si el índice de colaborador no corresponde a un SIGNER (p. ej. un viewer)', () => {
    const collaborators: CollaboratorFormValues[] = [
      {
        ...emptyViewer(),
        firstName: 'Carlos',
        lastName: 'Solares',
        email: 'c@correo.com',
        rfc: 'X',
      },
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: 1,
      activeRect: { left: 0, top: 0, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize: A4_PORTRAIT,
      collaborators,
      createId: () => 'new-id',
    });

    expect(result).toEqual({ outcome: 'noop' });
  });
});

/**
 * Hallazgo de la historia "Ajustar posicionamiento de firmas según orientación": el cuadro era un
 * porcentaje fijo de la página, así que en una hoja apaisada salía mucho más ancho y más chato que
 * en una vertical. Como la rúbrica se estampa llenando el cuadro, la firma del mismo firmante se
 * veía deformada según la hoja sobre la que la hubieran colocado.
 */
describe('resolveSignatureDrop — tamaño del cuadro según la hoja', () => {
  function dropAtCenter(pageSize: { width: number; height: number } | null) {
    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: 1,
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      pageSize,
      collaborators: [signerWith()],
      createId: () => 'nueva',
    });

    if (result.outcome !== 'committed')
      throw new Error('se esperaba committed');
    return result.signatures[0];
  }

  it('en A4 vertical persiste los ratios de siempre', () => {
    const position = dropAtCenter(A4_PORTRAIT);

    expect(position.widthRatio).toBeCloseTo(0.2, 6);
    expect(position.heightRatio).toBeCloseTo(0.08, 6);
  });

  it('en A4 apaisada persiste ratios distintos, para el mismo cuadro en puntos', () => {
    const vertical = dropAtCenter(A4_PORTRAIT);
    const apaisada = dropAtCenter(A4_LANDSCAPE);

    // Menos fracción de ancho (la hoja es más ancha) y más de alto (es más baja).
    expect(apaisada.widthRatio).toBeLessThan(vertical.widthRatio);
    expect(apaisada.heightRatio).toBeGreaterThan(vertical.heightRatio);

    // Y el cuadro mide lo mismo en puntos en las dos.
    expect(apaisada.widthRatio * A4_LANDSCAPE.width).toBeCloseTo(
      vertical.widthRatio * A4_PORTRAIT.width,
      6,
    );
    expect(apaisada.heightRatio * A4_LANDSCAPE.height).toBeCloseTo(
      vertical.heightRatio * A4_PORTRAIT.height,
      6,
    );
  });

  /**
   * El cuadro se centra en el punto donde se soltó, y de cuánto mide depende dónde queda su
   * esquina: si el tamaño cambia con la hoja, el centrado tiene que seguirlo.
   */
  it('centra el cuadro en el punto de suelta también en una hoja apaisada', () => {
    const position = dropAtCenter(A4_LANDSCAPE);

    expect(position.xRatio + position.widthRatio / 2).toBeCloseTo(0.5, 6);
    expect(position.yRatio + position.heightRatio / 2).toBeCloseTo(0.5, 6);
  });

  /** Sin tamaño de página reportado se usa la referencia A4 vertical, como antes de este cambio. */
  it('sin tamaño de página cae a los ratios de referencia', () => {
    const position = dropAtCenter(null);

    expect(position.widthRatio).toBeCloseTo(0.2, 6);
    expect(position.heightRatio).toBeCloseTo(0.08, 6);
  });
});
