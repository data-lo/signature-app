import {
  toRequiresDifferentSignatures,
  toCollaboratorPayload,
  toCollaboratorPayloads,
} from './collaborator-payload.mapper';
import {
  emptySigner,
  emptyWitness,
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
    ...emptyWitness(),
    firstName: 'Ana',
    lastName: 'Ruiz',
    email: 'ana@correo.com',
    taxId: 'AURU800101ABC',
  };
}

describe('toRequiresDifferentSignatures', () => {
  it('traduce el tipo del documento al vocabulario del backend', () => {
    expect(toRequiresDifferentSignatures('SIMPLE')).toBe('SIMPLE');
    expect(toRequiresDifferentSignatures('ADVANCED')).toBe('FIEL');
  });
});

describe('toCollaboratorPayload', () => {
  it('sin firmas colocadas, manda un arreglo vacío y ningún taxId para el firmante', () => {
    const payload = toCollaboratorPayload(signer(), 'SIMPLE');

    expect(payload.signatures).toEqual([]);
    expect(payload.taxId).toBeUndefined();
    // SIMPLE: requiresTwoFactorAuth forzado a true "oculto", sin importar el valor del form.
    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('historia "Selección de tipo de firma": un firmante con firma avanzada tampoco manda taxId', () => {
    const payload = toCollaboratorPayload(signer(), 'ADVANCED');

    expect(payload.taxId).toBeUndefined();
  });

  it('historia "Ubicación de firmas por usuario": traduce cada posición colocada al shape del backend', () => {
    const payload = toCollaboratorPayload(
      signer({
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
      'SIMPLE',
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

  it('un documento SIMPLE fuerza requiresTwoFactorAuth=true', () => {
    const payload = toCollaboratorPayload(
      signer(),
      'SIMPLE',
    );

    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('un documento ADVANCED aplica la configuración única de requiresTwoFactorAuth', () => {
    const payload = toCollaboratorPayload(
      signer(),
      'ADVANCED',
      0,
      false,
    );

    expect(payload.requiresTwoFactorAuth).toBe(false);
  });

  it('un viewer no manda signatures ni requiresTwoFactorAuth, pero sí su taxId', () => {
    const payload = toCollaboratorPayload(viewer(), 'ADVANCED');

    expect(payload.collaboratorType).toBe('WITNESS');
    expect(payload.signatures).toBeUndefined();
    expect(payload.requiresTwoFactorAuth).toBeUndefined();
    expect(payload.taxId).toBe('AURU800101ABC');
  });

  it('historia "Eliminar campo RFC de la sección de Espectadores": un viewer sin taxId lo manda vacío, no lo omite', () => {
    // `emptyWitness()` (no `viewer()`) porque tipa como WitnessFormValues y no como el union
    // CollaboratorFormValues: spreadear un union en un literal dispara el excess-property-check
    // de TypeScript contra la rama SIGNER, que no tiene `taxId`.
    const payload = toCollaboratorPayload(
      { ...emptyWitness(), taxId: '' },
      'ADVANCED',
    );

    expect(payload.taxId).toBe('');
  });

  it('historia "Habilitar ordenamiento Drag and Drop": sin orderIndex explícito, cae a 0 por defecto', () => {
    const payload = toCollaboratorPayload(signer(), 'SIMPLE');

    expect(payload.orderIndex).toBe(0);
  });

  it('historia "Habilitar ordenamiento Drag and Drop": refleja el orderIndex explícito para SIGNER y VIEWER', () => {
    const signerPayload = toCollaboratorPayload(signer(), 'SIMPLE', 2);
    const viewerPayload = toCollaboratorPayload(viewer(), 'SIMPLE', 1);

    expect(signerPayload.orderIndex).toBe(2);
    expect(viewerPayload.orderIndex).toBe(1);
  });
});

describe('toCollaboratorPayloads', () => {
  it('asigna el orderIndex según la posición en el arreglo ya reordenado', () => {
    const payloads = toCollaboratorPayloads(
      [
        signer({ email: 'primero@mail.com' }),
        viewer(),
        signer({ email: 'tercero@mail.com' }),
      ],
      'SIMPLE',
      true,
    );

    expect(payloads.map((payload) => payload.orderIndex)).toEqual([0, 1, 2]);
    expect(payloads.map((payload) => payload.email)).toEqual([
      'primero@mail.com',
      'ana@correo.com',
      'tercero@mail.com',
    ]);
  });
});
