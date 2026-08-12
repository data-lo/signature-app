import {
  createDocumentSignaturesSchema,
  emptySigner,
  emptyViewer,
  countSigners,
  type CollaboratorFormValues,
  type SignerFormValues,
} from './index';

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

function formValues(collaborators: CollaboratorFormValues[], includeMeAsSigner = false) {
  return {
    requiresApproval: false,
    requiresOrder: false,
    includeMeAsSigner,
    collaborators,
  };
}

describe('createDocumentSignaturesSchema', () => {
  it('acepta un firmante SIMPLE sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ signatureType: 'SIMPLE' })]),
    );

    expect(result.success).toBe(true);
  });

  it('rechaza un firmante ADVANCED sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ signatureType: 'ADVANCED', rfc: null })]),
    );

    expect(result.success).toBe(false);
  });

  it('el error de rfc faltante se reporta en el campo rfc del firmante, no en la raíz', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ signatureType: 'ADVANCED', rfc: null })]),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['collaborators', 0, 'rfc']);
  });

  it('acepta un firmante ADVANCED con rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ signatureType: 'ADVANCED', rfc: 'PEAJ800101XXX' })]),
    );

    expect(result.success).toBe(true);
  });

  it('rechaza un espectador sin rfc', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([{ ...viewer(), rfc: '' }]),
    );

    expect(result.success).toBe(false);
  });

  it('rechaza un correo con formato inválido', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ email: 'no-es-un-correo' })]),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['collaborators', 0, 'email']);
  });

  it('rechaza si no hay ningún firmante manual ni "incluirme como firmante"', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([viewer()]),
    );

    expect(result.success).toBe(false);
  });

  it('la regla cruzada apunta al arreglo completo (error general de la sección de participantes)', () => {
    const result = createDocumentSignaturesSchema.safeParse(formValues([]));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['collaborators']);
    expect(result.error?.issues[0].message).toMatch(/al menos un firmante/i);
  });

  it('acepta sin firmante manual si "incluirme como firmante" está activo', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([], true),
    );

    expect(result.success).toBe(true);
  });
});

describe('countSigners', () => {
  it('cuenta solo colaboradores de tipo SIGNER', () => {
    expect(countSigners([signer(), viewer(), signer()])).toBe(2);
  });

  it('sin colaboradores, es 0', () => {
    expect(countSigners([])).toBe(0);
  });
});
