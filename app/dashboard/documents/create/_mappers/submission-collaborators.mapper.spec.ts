import {
  buildSelfSigner,
  buildSubmissionCollaborators,
} from './submission-collaborators.mapper';
import { emptySigner, type CreateDocumentSignaturesFormValues } from '../_schemas';
import type { CurrentUser } from '@/lib/api/auth';

const CURRENT_USER = {
  firstName: 'Creador',
  lastName: 'Uno',
  email: 'creador@correo.com',
  rfc: 'CRUN800101ABC',
} as CurrentUser;

function formValues(
  overrides: Partial<CreateDocumentSignaturesFormValues> = {},
): CreateDocumentSignaturesFormValues {
  return {
    requiresApproval: false,
    requiresOrder: false,
    includeMeAsSigner: false,
    collaborators: [],
    ...overrides,
  };
}

describe('buildSelfSigner', () => {
  it('autocompleta al usuario en sesión como firmante SIMPLE con 2FA y sin firmas colocadas', () => {
    expect(buildSelfSigner(CURRENT_USER)).toEqual({
      collaboratorType: 'SIGNER',
      firstName: 'Creador',
      lastName: 'Uno',
      email: 'creador@correo.com',
      signatureType: 'SIMPLE',
      rfc: 'CRUN800101ABC',
      requiresTwoFactorAuth: true,
      signatures: [],
    });
  });
});

describe('buildSubmissionCollaborators', () => {
  it('sin "incluirme como firmante", envía solo los colaboradores capturados', () => {
    const manualSigner = emptySigner();

    const result = buildSubmissionCollaborators(
      formValues({ collaborators: [manualSigner] }),
      CURRENT_USER,
    );

    expect(result).toEqual([manualSigner]);
  });

  it('con "incluirme como firmante", agrega al usuario en sesión al final (respeta el orden definido a mano)', () => {
    const manualSigner = { ...emptySigner(), email: 'manual@correo.com' };

    const result = buildSubmissionCollaborators(
      formValues({ collaborators: [manualSigner], includeMeAsSigner: true }),
      CURRENT_USER,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(manualSigner);
    expect(result[1]).toEqual(buildSelfSigner(CURRENT_USER));
  });

  it('si el usuario en sesión todavía no cargó, no agrega un firmante vacío', () => {
    const result = buildSubmissionCollaborators(
      formValues({ includeMeAsSigner: true }),
      undefined,
    );

    expect(result).toEqual([]);
  });

  it('no muta el arreglo del formulario', () => {
    const collaborators = [emptySigner()];

    buildSubmissionCollaborators(
      formValues({ collaborators, includeMeAsSigner: true }),
      CURRENT_USER,
    );

    expect(collaborators).toHaveLength(1);
  });
});
