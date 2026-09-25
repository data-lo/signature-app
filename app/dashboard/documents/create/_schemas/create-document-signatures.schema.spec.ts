import {
  REVIEWER_REQUIRED_MESSAGE,
  SIGNATURE_POSITION_REQUIRED_MESSAGE,
  createDocumentSignaturesSchema,
  emptySigner,
  emptyViewer,
  countSigners,
  signersWithoutPosition,
  type CollaboratorFormValues,
  type SignerFormValues,
  type ViewerFormValues,
} from './index';

/** Una ubicación de firma cualquiera, válida: el envío exige al menos una por firmante. */
const PLACED_SIGNATURE = {
  id: 'sig-1',
  page: 1,
  xRatio: 0.1,
  yRatio: 0.1,
  widthRatio: 0.2,
  heightRatio: 0.08,
};

function signer(overrides: Partial<SignerFormValues> = {}): SignerFormValues {
  return {
    ...emptySigner(),
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@mail.com',
    signatures: [PLACED_SIGNATURE],
    ...overrides,
  };
}

function viewer(): ViewerFormValues {
  return {
    ...emptyViewer(),
    firstName: 'Ana',
    lastName: 'Ruiz',
    email: 'ana@correo.com',
    taxId: 'AURU800101ABC',
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
    reviewerUserId: null,
    requiresOrder: false,
    includeMeAsSigner,
    isIndexable: true,
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

  it('historia "Selección de tipo de firma": acepta firma avanzada sin pedirle taxId al firmante', () => {
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

  it('acepta un espectador sin taxId', () => {
    const result = createDocumentSignaturesSchema.safeParse(
      formValues([signer(), { ...viewer(), taxId: '' }]),
    );

    expect(result.success).toBe(true);
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

  /**
   * Historia "Hacer obligatorias las coordenadas de posición de firma": no se envía una solicitud
   * con un firmante cuya firma no está ubicada en el documento.
   */
  describe('ubicación de firma', () => {
    it('rechaza un firmante sin ubicación, con el error en su campo de firmas', () => {
      const result = createDocumentSignaturesSchema.safeParse(
        formValues([signer(), signer({ signatures: [] })]),
      );

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          path: ['collaborators', 1, 'signatures'],
          message: SIGNATURE_POSITION_REQUIRED_MESSAGE,
        }),
      ]);
    });

    it('no se lo exige a un espectador', () => {
      const result = createDocumentSignaturesSchema.safeParse(
        formValues([signer(), viewer()]),
      );

      expect(result.success).toBe(true);
    });

    it('rechaza una ubicación con ratios fuera de rango', () => {
      const result = createDocumentSignaturesSchema.safeParse(
        formValues([
          signer({ signatures: [{ ...PLACED_SIGNATURE, xRatio: 1.5 }] }),
        ]),
      );

      expect(result.success).toBe(false);
    });
  });

  /**
   * Historia "Selección de aprobador al requerir aprobación en nuevo documento": la aprobación no
   * viaja sola, y la regla vive en el esquema (no en el selector) porque el selector puede no
   * estar en pantalla y el envío tiene que rechazarse igual.
   */
  describe('aprobador', () => {
    it('con aprobación activa y sin aprobador, el error apunta al selector', () => {
      const result = createDocumentSignaturesSchema.safeParse({
        ...formValues([signer()]),
        requiresApproval: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(['reviewerUserId']);
      expect(result.error?.issues[0].message).toBe(REVIEWER_REQUIRED_MESSAGE);
    });

    it('con aprobación activa y un aprobador elegido, acepta', () => {
      const result = createDocumentSignaturesSchema.safeParse({
        ...formValues([signer()]),
        requiresApproval: true,
        reviewerUserId: 'user-1',
      });

      expect(result.success).toBe(true);
    });

    it('sin aprobación, no se exige aprobador', () => {
      const result = createDocumentSignaturesSchema.safeParse({
        ...formValues([signer()]),
        requiresApproval: false,
      });

      expect(result.success).toBe(true);
    });
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

describe('signersWithoutPosition', () => {
  it('devuelve por nombre, y en orden, los firmantes sin ninguna firma ubicada', () => {
    expect(
      signersWithoutPosition([
        signer({ signatures: [] }),
        viewer(),
        signer({ firstName: 'María', lastName: 'Gómez' }),
        signer({ firstName: '', lastName: '', email: '', signatures: [] }),
      ]),
    ).toEqual(['Juan Pérez', 'Firmante 3']);
  });

  it('usa el correo si el firmante todavía no tiene nombre', () => {
    expect(
      signersWithoutPosition([
        signer({ firstName: '', lastName: '', signatures: [] }),
      ]),
    ).toEqual(['juan.perez@mail.com']);
  });

  it('está vacío si todos tienen su firma ubicada', () => {
    expect(signersWithoutPosition([signer(), viewer()])).toEqual([]);
  });
});
