import {
  createDocumentSignaturesSchema,
  emptySigner,
  emptyViewer,
  countSigners,
  type CollaboratorFormValues,
  type SignerFormValues,
  type ViewerFormValues,
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

function viewer(): ViewerFormValues {
  return {
    ...emptyViewer(),
    firstName: 'Ana',
    lastName: 'Ruiz',
    email: 'ana@correo.com',
    rfc: 'AURU800101ABC',
  };
}

function formValues(
  collaborators: CollaboratorFormValues[],
  includeMeAsSigner = false,
  signatureType: 'SIMPLE' | 'ADVANCED' = 'SIMPLE',
) {
  return {
    signatureType,
    requiresTwoFactorAuth: true,
    requiresApproval: false,
    requiresOrder: false,
    includeMeAsSigner,
    collaborators,
  };
}

describe('createDocumentSignaturesSchema', () => {
  it('acepta un documento de firma simple con un firmante', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer()]),
    );

    expect(result.success).toBe(true);
  });

  it('historia "Selección de tipo de firma": acepta firma avanzada sin pedirle rfc al firmante', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer()], false, 'ADVANCED'),
    );

    expect(result.success).toBe(true);
  });

  it('historia "Selección de tipo de firma": rechaza cualquier tipo de firma fuera de los dos flujos', () => {
    const result = createDocumentSignaturesSchema.safeParse({
      ...formValues([signer()]),
      signatureType: 'MIX',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['signatureType']);
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

  it('rechaza si solo hay espectadores', () => {
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

  /**
   * Antes bastaba con el checkbox marcado para dar por válido el formulario, porque el firmante
   * "yo" no existía hasta el envío. Desde la historia "Crear y eliminar automáticamente el
   * participante Usuario firmante" esa tarjeta es un SIGNER más del arreglo, así que la regla
   * cuenta el arreglo y nada más: lo que se valida es lo que se ve en pantalla.
   */
  it('el checkbox por sí solo no alcanza: lo que cuenta es la tarjeta ya agregada al arreglo', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([], true),
    );

    expect(result.success).toBe(false);
  });

  it('acepta cuando la tarjeta del usuario en sesión es el único firmante', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer({ isSelf: true })], true),
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
