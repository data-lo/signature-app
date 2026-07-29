import { resolveSignatureDrop } from './resolveSignatureDrop';
import { emptySigner, emptyViewer, type CollaboratorFormValues } from '../_schemas';

const CONTAINER_RECT = { left: 0, top: 0, width: 1000, height: 1000 };

function signerWith(
  overrides: Partial<ReturnType<typeof emptySigner>> = {},
): CollaboratorFormValues {
  return { ...emptySigner(), firstName: 'Ana', lastName: 'Gómez', ...overrides };
}

describe('resolveSignatureDrop', () => {
  it('agrega una nueva entrada al soltar un chip sobre una página válida, sin tocar entradas existentes', () => {
    const collaborators = [
      signerWith({
        signatures: [
          { id: 'existing-1', page: 1, xRatio: 0.1, yRatio: 0.1, widthRatio: 0.2, heightRatio: 0.08 },
        ],
      }),
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: 2,
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
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
          { id: 'existing-1', page: 1, xRatio: 0.4, yRatio: 0.4, widthRatio: 0.2, heightRatio: 0.08 },
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
      collaborators,
      createId: () => 'new-id',
    });

    expect(result.outcome).toBe('rejected');
  });

  it('actualiza (no agrega) al mover una caja existente por su id, sin chocar consigo misma', () => {
    const collaborators = [
      signerWith({
        signatures: [
          { id: 'existing-1', page: 1, xRatio: 0.1, yRatio: 0.1, widthRatio: 0.2, heightRatio: 0.08 },
        ],
      }),
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'box', collaboratorIndex: 0, signatureId: 'existing-1' },
      pageNumber: 1,
      activeRect: { left: 495, top: 495, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
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
      collaborators,
      createId: () => 'new-id',
    });

    expect(result).toEqual({ outcome: 'noop' });
  });

  it('no hace nada si el índice de colaborador no corresponde a un SIGNER (p. ej. un viewer)', () => {
    const collaborators: CollaboratorFormValues[] = [
      { ...emptyViewer(), firstName: 'Carlos', lastName: 'Solares', email: 'c@correo.com', rfc: 'X' },
    ];

    const result = resolveSignatureDrop({
      dragPayload: { type: 'chip', collaboratorIndex: 0 },
      pageNumber: 1,
      activeRect: { left: 0, top: 0, width: 10, height: 10 },
      containerRect: CONTAINER_RECT,
      collaborators,
      createId: () => 'new-id',
    });

    expect(result).toEqual({ outcome: 'noop' });
  });
});
