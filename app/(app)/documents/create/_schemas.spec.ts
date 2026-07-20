import {
  createDocumentSignaturesSchema,
  computeRequiresDifferentSignatures,
  toBackendCollaboratorPayload,
  emptySigner,
  emptyViewer,
  type CollaboratorFormValues,
  type SignerFormValues,
} from './_schemas';

function signer(overrides: Partial<SignerFormValues> = {}): SignerFormValues {
  return {
    ...emptySigner(),
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@mail.com',
    ...overrides,
  };
}

describe('createDocumentSignaturesSchema', () => {
  it('acepta un firmante SIMPLE sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: false,
      collaborators: [signer({ signatureType: 'SIMPLE' })],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un firmante ADVANCED sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: false,
      collaborators: [
        signer({ signatureType: 'ADVANCED', rfc: null }),
      ],
    });

    expect(result.success).toBe(false);
  });

  it('acepta un firmante ADVANCED con rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: false,
      collaborators: [
        signer({ signatureType: 'ADVANCED', rfc: 'PEAJ800101XXX' }),
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un espectador sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: false,
      collaborators: [{ ...emptyViewer(), firstName: 'Ana', lastName: 'Ruiz', email: 'ana@correo.com', rfc: '' }],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza si no hay ningún firmante manual ni "incluirme como firmante"', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: false,
      collaborators: [{ ...emptyViewer(), firstName: 'Ana', lastName: 'Ruiz', email: 'ana@correo.com', rfc: 'AURU800101ABC' }],
    });

    expect(result.success).toBe(false);
  });

  it('acepta sin firmante manual si "incluirme como firmante" está activo', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      requiresApproval: false,
      includeMeAsSigner: true,
      collaborators: [],
    });

    expect(result.success).toBe(true);
  });
});

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
      { ...emptyViewer(), firstName: 'Ana', lastName: 'Ruiz', email: 'ana@correo.com', rfc: 'AURU800101ABC' },
    ];
    expect(computeRequiresDifferentSignatures(collaborators)).toBe('SIMPLE');
  });
});

describe('toBackendCollaboratorPayload', () => {
  it('inyecta la posición de firma por defecto y no manda rfc para SIMPLE', () => {
    const payload = toBackendCollaboratorPayload(
      signer({ signatureType: 'SIMPLE', rfc: null }),
    );

    expect(payload.signaturePosition).toEqual({ page: 1, x: 100, y: 100 });
    expect(payload.rfc).toBeNull();
    // SIMPLE: requiresTwoFactorAuth forzado a true "oculto", sin importar el valor del form.
    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('SIMPLE fuerza requiresTwoFactorAuth=true aunque el form tenga false', () => {
    const payload = toBackendCollaboratorPayload(
      signer({ signatureType: 'SIMPLE', requiresTwoFactorAuth: false }),
    );

    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('ADVANCED respeta el valor explícito de requiresTwoFactorAuth y manda el rfc', () => {
    const payload = toBackendCollaboratorPayload(
      signer({
        signatureType: 'ADVANCED',
        rfc: 'PEAJ800101XXX',
        requiresTwoFactorAuth: false,
      }),
    );

    expect(payload.rfc).toBe('PEAJ800101XXX');
    expect(payload.requiresTwoFactorAuth).toBe(false);
  });

  it('un viewer no manda signatureType, signaturePosition ni requiresTwoFactorAuth', () => {
    const payload = toBackendCollaboratorPayload({
      ...emptyViewer(),
      firstName: 'Ana',
      lastName: 'Ruiz',
      email: 'ana@correo.com',
      rfc: 'AURU800101ABC',
    });

    expect(payload.collaboratorType).toBe('VIEWER');
    expect(payload.signatureType).toBeUndefined();
    expect(payload.signaturePosition).toBeUndefined();
    expect(payload.requiresTwoFactorAuth).toBeUndefined();
    expect(payload.rfc).toBe('AURU800101ABC');
  });
});
