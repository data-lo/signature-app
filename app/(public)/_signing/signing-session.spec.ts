import { SignatureType } from '@/lib/enums/document';
import {
  fromPublicSigningInvitation,
  fromSigningSessionResponse,
  toSignatureFlowType,
} from './signing-session';

describe('toSignatureFlowType', () => {
  it.each([
    ['SIMPLE', 'SIMPLE'],
    ['FIEL', 'ADVANCED'],
    ['BIOMETRIC', 'BIOMETRIC'],
    ['NOM151', null],
    ['constructor', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(toSignatureFlowType(input)).toBe(expected);
  });
});

describe('fromSigningSessionResponse (adaptador de /sign/:token)', () => {
  it('normaliza una sesión activa', () => {
    expect(
      fromSigningSessionResponse({
        status: 'ACTIVE',
        document: { id: 'doc-1', name: 'contrato.pdf' },
        signer: {
          collaboratorId: 'c-1',
          maskedEmail: 'a***@empresa.com',
          accountStatus: null,
          guestSigningAllowed: true,
        },
        signature: {
          type: 'FIEL',
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
        expiresAt: '2026-11-01T00:00:00.000Z',
      }),
    ).toEqual({
      status: 'ACTIVE',
      document: { id: 'doc-1', name: 'contrato.pdf' },
      signer: {
        collaboratorId: 'c-1',
        maskedEmail: 'a***@empresa.com',
        accountStatus: 'NONE',
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
      expiresAt: '2026-11-01T00:00:00.000Z',
    });
  });

  it.each([
    'EXPIRED',
    'REVOKED',
    'ALREADY_SIGNED',
    'DOCUMENT_CANCELLED',
    'UNAVAILABLE',
  ] as const)('%s: sólo el estado, aunque llegaran datos', (status) => {
    expect(
      fromSigningSessionResponse({
        status,
        document: { id: 'doc-1', name: 'contrato.pdf' },
      }),
    ).toEqual({ status });
  });

  it('ACTIVE incompleto se trata como invitación inválida', () => {
    expect(fromSigningSessionResponse({ status: 'ACTIVE' })).toEqual({
      status: 'INVALID',
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
