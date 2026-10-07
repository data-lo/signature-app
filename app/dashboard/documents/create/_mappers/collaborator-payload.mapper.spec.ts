import {
  toRequiresDifferentSignatures,
  toCollaboratorPayload,
  toCollaboratorPayloads,
} from './collaborator-payload.mapper';
import {
  collaboratorFromDirectoryContact,
  emptySigner,
  emptyWitness,
  type CollaboratorFormValues,
  type SignerFormValues,
} from '../_schemas';
import type {
  CollaboratorPayload,
  ManualCollaboratorPayload,
} from '../_interfaces/create-document-signatures-request.interface';

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

/** Estrecha el payload a la rama MANUAL, la única que lleva identidad y `taxId`. */
function manual(payload: CollaboratorPayload): ManualCollaboratorPayload {
  if (payload.source !== 'MANUAL') {
    throw new Error(
      `se esperaba un colaborador MANUAL y llegó ${payload.source}`,
    );
  }
  return payload;
}

describe('toRequiresDifferentSignatures', () => {
  it('traduce el tipo del documento al vocabulario del backend', () => {
    expect(toRequiresDifferentSignatures('SIMPLE')).toBe('SIMPLE');
    expect(toRequiresDifferentSignatures('ADVANCED')).toBe('FIEL');
    expect(toRequiresDifferentSignatures('BIOMETRIC')).toBe('BIOMETRIC');
  });
});

describe('toCollaboratorPayload', () => {
  it('sin firmas colocadas, manda un arreglo vacío y ningún taxId para el firmante', () => {
    const payload = toCollaboratorPayload(signer(), 'SIMPLE');

    expect(payload.signatures).toEqual([]);
    expect(manual(payload).taxId).toBeUndefined();
    // SIMPLE: requiresTwoFactorAuth forzado a true "oculto", sin importar el valor del form.
    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('historia "Selección de tipo de firma": un firmante con firma avanzada tampoco manda taxId', () => {
    const payload = toCollaboratorPayload(signer(), 'ADVANCED');

    expect(manual(payload).taxId).toBeUndefined();
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
    const payload = toCollaboratorPayload(signer(), 'SIMPLE');

    expect(payload.requiresTwoFactorAuth).toBe(true);
  });

  it('un documento ADVANCED aplica la configuración única de requiresTwoFactorAuth', () => {
    const payload = toCollaboratorPayload(signer(), 'ADVANCED', 0, false);

    expect(payload.requiresTwoFactorAuth).toBe(false);
  });

  it('un documento BIOMETRIC aplica la configuración única de requiresTwoFactorAuth', () => {
    const payload = toCollaboratorPayload(signer(), 'BIOMETRIC', 0, false);

    expect(payload.requiresTwoFactorAuth).toBe(false);
  });

  it('un viewer no manda signatures ni requiresTwoFactorAuth, pero sí su taxId', () => {
    const payload = toCollaboratorPayload(viewer(), 'ADVANCED');

    expect(payload.collaboratorType).toBe('WITNESS');
    expect(payload.signatures).toBeUndefined();
    expect(payload.requiresTwoFactorAuth).toBeUndefined();
    expect(manual(payload).taxId).toBe('AURU800101ABC');
  });

  it('historia "Eliminar campo RFC de la sección de Espectadores": un viewer sin taxId lo manda vacío, no lo omite', () => {
    // `emptyWitness()` (no `viewer()`) porque tipa como WitnessFormValues y no como el union
    // CollaboratorFormValues: spreadear un union en un literal dispara el excess-property-check
    // de TypeScript contra la rama SIGNER, que no tiene `taxId`.
    const payload = toCollaboratorPayload(
      { ...emptyWitness(), taxId: '' },
      'ADVANCED',
    );

    expect(manual(payload).taxId).toBe('');
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
    expect(payloads.map((payload) => manual(payload).email)).toEqual([
      'primero@mail.com',
      'ana@correo.com',
      'tercero@mail.com',
    ]);
  });
});

/**
 * Historia "Enviar colaboradores desde Directorio mediante usuario vinculado al crear un
 * documento": el payload distingue el origen con `source`.
 */
describe('toCollaboratorPayload · origen', () => {
  const ANA = {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    linkedUserId: 'user-ana',
  };

  it('un firmante manual manda sus datos, source MANUAL y addToDirectory', () => {
    const payload = toCollaboratorPayload(
      signer({ addToDirectory: true }),
      'SIMPLE',
    );

    expect(payload).toMatchObject({
      source: 'MANUAL',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@mail.com',
      addToDirectory: true,
    });
  });

  it('sin la casilla tocada, un manual manda addToDirectory en false, no lo omite', () => {
    const withoutFlag = signer();
    delete withoutFlag.addToDirectory;
    const payload = manual(toCollaboratorPayload(withoutFlag, 'SIMPLE'));

    expect(payload.addToDirectory).toBe(false);
  });

  it('un firmante del Directorio manda sólo linkedUserId y los datos de su firma', () => {
    const fromDirectory = {
      ...(collaboratorFromDirectoryContact(ANA, 'SIGNER') as SignerFormValues),
      signatures: [
        {
          id: 'sig-1',
          page: 1,
          xRatio: 0.1,
          yRatio: 0.2,
          widthRatio: 0.2,
          heightRatio: 0.08,
        },
      ],
    };

    const payload = toCollaboratorPayload(fromDirectory, 'ADVANCED', 3, false);

    expect(payload).toEqual({
      source: 'DIRECTORY',
      linkedUserId: 'user-ana',
      collaboratorType: 'SIGNER',
      signatures: [
        {
          signatureId: 'sig-1',
          page: 1,
          xRatio: 0.1,
          yRatio: 0.2,
          widthRatio: 0.2,
          heightRatio: 0.08,
        },
      ],
      requiresTwoFactorAuth: false,
      orderIndex: 3,
    });
  });

  it('un testigo del Directorio no manda nombre, apellido, correo, taxId ni addToDirectory', () => {
    const payload = toCollaboratorPayload(
      collaboratorFromDirectoryContact(ANA, 'WITNESS'),
      'SIMPLE',
      1,
    );

    expect(payload).toEqual({
      source: 'DIRECTORY',
      linkedUserId: 'user-ana',
      collaboratorType: 'WITNESS',
      orderIndex: 1,
    });
  });

  it('un contacto del Directorio sin usuario vinculado viaja como MANUAL con sus datos', () => {
    const payload = toCollaboratorPayload(
      collaboratorFromDirectoryContact(
        { ...ANA, linkedUserId: null },
        'WITNESS',
      ),
      'SIMPLE',
    );

    expect(payload).toMatchObject({
      source: 'MANUAL',
      firstName: 'Ana',
      email: 'ana@example.com',
      addToDirectory: false,
    });
  });

  it('en firma SIMPLE, un firmante del Directorio también lleva 2FA forzado', () => {
    const payload = toCollaboratorPayload(
      collaboratorFromDirectoryContact(ANA, 'SIGNER'),
      'SIMPLE',
      0,
      false,
    );

    expect(payload.requiresTwoFactorAuth).toBe(true);
  });
});
