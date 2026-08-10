import {
  computeRequiresDifferentSignatures,
  toCollaboratorPayload,
  toCollaboratorPayloads,
} from './collaborator-payload.mapper';
import {
  emptySigner,
  emptyViewer,
  type CollaboratorFormValues,
  type SignerFormValues,
} from '../_schemas';

function signer(overrides: Partial<SignerFormValues> = {}): SignerFormValues {
  return {
    ...emptySigner(),
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@mail.com',
    ...overrides,
  };
}

function viewer(): CollaboratorFormValues {
  return {
    ...emptyViewer(),
    firstName: 'Ana',
    lastName: 'Ruiz',
    email: 'ana@correo.com',
    rfc: 'AURU800101ABC',
  };
}

describe('computeRequiresDifferentSignatures', () => {
  it('SIMPLE cuando todos los firmantes son SIMPLE', () => {
    const collaborators: CollaboratorFormValues[] = [
      signer({ signatureType: 'SIMPLE' }),
      signer({ signatureType: 'SIMPLE', email: 'otro@mail.com' }),
    ];
    expect(computeRequiresDifferentSignatures(collaborators)).toBe('SIMPLE');
  });

  it('FIEL cuando todos los firmantes son ADVANCED', () => {
    const collaborators: CollaboratorFormValues[] = [
      signer({ signatureType: 'ADVANCED', rfc: 'PEAJ800101XXX' }),
    ];
    expect(computeRequiresDifferentSignatures(collaborators)).toBe('FIEL');
  });

  it('MIX cuando hay una combinación de tipos de firma', () => {
    const collaborators: CollaboratorFormValues[] = [
      signer({ signatureType: 'SIMPLE' }),
      signer({
        signatureType: 'ADVANCED',
        rfc: 'PEAJ800101XXX',
        email: 'otro@mail.com',
      }),
    ];
    expect(computeRequiresDifferentSignatures(collaborators)).toBe('MIX');
  });

  it('ignora a los espectadores para el cálculo', () => {
    const collaborators: CollaboratorFormValues[] = [
      signer({ signatureType: 'SIMPLE' }),
      viewer(),
    ];
    expect(computeRequiresDifferentSignatures(collaborators)).toBe('SIMPLE');
  });
});

describe('toCollaboratorPayload', () => {
  it('sin firmas colocadas, manda un arreglo vacío y no manda rfc para SIMPLE', () => {
    const payload = toCollaboratorPayload(
      signer({ signatureType: 'SIMPLE', rfc: null }),
    );

    expect(payload.signatures).toEqual([]);
    expect(payload.rfc).toBeNull();
    // SIMPLE: requiresTwoFactorAuth forzado a true "oculto", sin importar el valor del form.
    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('historia "Ubicación de firmas por usuario": traduce cada posición colocada al shape del backend', () => {
    const payload = toCollaboratorPayload(
      signer({
        signatureType: 'SIMPLE',
        signatures: [
          {
            id: 'client-id-1',
            page: 2,
            xRatio: 0.3,
            yRatio: 0.4,
            widthRatio: 0.2,
            heightRatio: 0.08,
          },
        ],
      }),
    );

    expect(payload.signatures).toEqual([
      {
        signatureId: 'client-id-1',
        page: 2,
        xRatio: 0.3,
        yRatio: 0.4,
        widthRatio: 0.2,
        heightRatio: 0.08,
      },
    ]);
  });

  it('SIMPLE fuerza requiresTwoFactorAuth=true aunque el form tenga false', () => {
    const payload = toCollaboratorPayload(
      signer({ signatureType: 'SIMPLE', requiresTwoFactorAuth: false }),
    );

    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('ADVANCED respeta el valor explícito de requiresTwoFactorAuth y manda el rfc', () => {
    const payload = toCollaboratorPayload(
      signer({
        signatureType: 'ADVANCED',
        rfc: 'PEAJ800101XXX',
        requiresTwoFactorAuth: false,
      }),
    );

    expect(payload.rfc).toBe('PEAJ800101XXX');
    expect(payload.requiresTwoFactorAuth).toBe(false);
  });

  it('un viewer no manda signatureType, signatures ni requiresTwoFactorAuth', () => {
    const payload = toCollaboratorPayload(viewer());

    expect(payload.collaboratorType).toBe('VIEWER');
    expect(payload.signatureType).toBeUndefined();
    expect(payload.signatures).toBeUndefined();
    expect(payload.requiresTwoFactorAuth).toBeUndefined();
    expect(payload.rfc).toBe('AURU800101ABC');
  });

  it('historia "Habilitar ordenamiento Drag and Drop": sin orderIndex explícito, cae a 0 por defecto', () => {
    const payload = toCollaboratorPayload(signer({ signatureType: 'SIMPLE' }));

    expect(payload.orderIndex).toBe(0);
  });

  it('historia "Habilitar ordenamiento Drag and Drop": refleja el orderIndex explícito para SIGNER y VIEWER', () => {
    const signerPayload = toCollaboratorPayload(
      signer({ signatureType: 'SIMPLE' }),
      2,
    );
    const viewerPayload = toCollaboratorPayload(viewer(), 1);

    expect(signerPayload.orderIndex).toBe(2);
    expect(viewerPayload.orderIndex).toBe(1);
  });
});

describe('toCollaboratorPayloads', () => {
  it('asigna el orderIndex según la posición en el arreglo ya reordenado', () => {
    const payloads = toCollaboratorPayloads([
      signer({ email: 'primero@mail.com' }),
      viewer(),
      signer({ email: 'tercero@mail.com' }),
    ]);

    expect(payloads.map((payload) => payload.orderIndex)).toEqual([0, 1, 2]);
    expect(payloads.map((payload) => payload.email)).toEqual([
      'primero@mail.com',
      'ana@correo.com',
      'tercero@mail.com',
    ]);
  });
});
