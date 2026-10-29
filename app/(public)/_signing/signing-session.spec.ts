import { SignatureType } from '@/lib/enums/document';
import {
  fromPublicSigningInvitation,
  fromCurrentSigningSession,
  invitationStatusOf,
  toSignatureFlowType,
} from './signing-session';

describe('toSignatureFlowType', () => {
  it.each([
    ['SIMPLE', 'SIMPLE'],
    ['FIEL', 'ADVANCED'],
    ['ADVANCED', 'ADVANCED'],
    ['BIOMETRIC', 'BIOMETRIC'],
    ['NOM151', null],
    ['constructor', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(toSignatureFlowType(input)).toBe(expected);
  });
});

describe('invitationStatusOf (antes del código: /sign/:token y /sign/launch/:token)', () => {
  const active = {
    status: 'ACTIVE' as const,
    document: { name: 'contrato.pdf' },
    signer: {
      maskedEmail: 'a***@correo.com',
      accountStatus: 'PROVISIONED' as const,
      publicSigningAllowed: true,
    },
    signature: {
      type: 'SIMPLE',
      requiresEmailVerification: true,
      requiresIdentityValidation: true,
    },
  };

  it('activa y con firma pública: puede pedir el código', () => {
    expect(invitationStatusOf(active)).toBe('ACTIVE');
  });

  it('activa pero vinculada a una cuenta: se firma desde la plataforma', () => {
    expect(
      invitationStatusOf({
        ...active,
        signer: { ...active.signer, publicSigningAllowed: false },
      }),
    ).toBe('ACCOUNT_REQUIRED');
  });

  it.each([
    'WAITING_FOR_PREVIOUS_SIGNER',
    'EXPIRED',
    'REVOKED',
    'ALREADY_SIGNED',
    'DOCUMENT_CANCELLED',
    'UNAVAILABLE',
  ] as const)('%s pasa tal cual', (status) => {
    expect(invitationStatusOf({ status })).toBe(status);
  });

  it('ACTIVE incompleto se trata como invitación inválida', () => {
    expect(invitationStatusOf({ status: 'ACTIVE' })).toBe('INVALID');
  });
});

describe('fromCurrentSigningSession (después del código, misma sesión para correo y portal)', () => {
  it('normaliza la sesión sin ids del documento ni del colaborador', () => {
    const session = fromCurrentSigningSession({
      status: 'READY_TO_SIGN',
      document: {
        name: 'contrato.pdf',
        status: 'PENDING_SIGNATURE',
        totalPages: 2,
        documentHash: 'h'.repeat(64),
      },
      signer: {
        name: 'Ana López',
        emailMasked: 'a***@correo.com',
        maskedEmail: 'a***@correo.com',
        isProvisional: true,
        status: 'PENDING',
        canSign: true,
        accountStatus: 'PROVISIONED',
      },
      signature: {
        type: 'ADVANCED',
        emailVerified: true,
        requiresEmailVerification: true,
        requiresIdentityValidation: false,
        identityProvider: null,
        requiresCertificateValidation: true,
        certificateRequirements: {
          validateValidity: true,
          validateRevocation: true,
          validateSubjectMatch: true,
        },
        credentialStatus: null,
        identityVerification: null,
      },
      positions: [
        {
          page: 1,
          xRatio: 0.1,
          yRatio: 0.2,
          widthRatio: 0.3,
          heightRatio: 0.1,
        },
      ],
      session: { expiresAt: '2026-10-27T20:00:00.000Z' },
    });

    expect(session).toEqual({
      status: 'ACTIVE',
      document: { id: null, name: 'contrato.pdf' },
      signer: {
        collaboratorId: null,
        maskedEmail: 'a***@correo.com',
        accountStatus: 'PROVISIONED',
        guestSigningAllowed: true,
      },
      signature: {
        type: 'ADVANCED',
        requiresEmailVerification: true,
        requiresIdentityValidation: false,
      },
      positions: [
        {
          page: 1,
          xRatio: 0.1,
          yRatio: 0.2,
          widthRatio: 0.3,
          heightRatio: 0.1,
        },
      ],
      expiresAt: '2026-10-27T20:00:00.000Z',
      sessionDetails: {
        documentHash: 'h'.repeat(64),
        canSign: true,
        credentialStatus: null,
        readiness: 'READY_TO_SIGN',
        identityVerification: null,
        certificateRequirements: {
          validateValidity: true,
          validateRevocation: true,
          validateSubjectMatch: true,
        },
      },
    });
  });
});

describe('fromPublicSigningInvitation (adaptador de /public/documents/:id/sign)', () => {
  const invitation = {
    documentName: 'contrato.pdf',
    maskedEmail: 'a***@empresa.com',
    signatureType: SignatureType.BIOMETRIC,
    availableForSigning: true,
    guestSigningAllowed: true,
  };

  it('arma la sesión con el colaborador y el correo del enlace', () => {
    expect(
      fromPublicSigningInvitation('doc-1', invitation, {
        collaboratorId: 'c-1',
        email: 'ana@empresa.com',
      }),
    ).toEqual({
      status: 'ACTIVE',
      document: { id: 'doc-1', name: 'contrato.pdf' },
      signer: {
        collaboratorId: 'c-1',
        email: 'ana@empresa.com',
        maskedEmail: 'a***@empresa.com',
        accountStatus: 'NONE',
        guestSigningAllowed: true,
      },
      signature: {
        type: 'BIOMETRIC',
        requiresEmailVerification: true,
        requiresIdentityValidation: true,
      },
      positions: [],
    });
  });

  it('de regreso de Didit, sin invitación: biometría sin colaborador ni nombre', () => {
    const session = fromPublicSigningInvitation(
      'doc-1',
      null,
      { collaboratorId: null, email: null },
      SignatureType.BIOMETRIC,
    );

    expect(session.document).toEqual({ id: 'doc-1', name: null });
    expect(session.signer.collaboratorId).toBeNull();
    expect(session.signature.type).toBe('BIOMETRIC');
  });
});
