import apiClient from '@/lib/axios';
import {
  clearPublicSigningContext,
  getPublicSigningContext,
  linkInvitationRequest,
  resolvePublicSigningDestination,
  setPublicSigningContext,
} from './public-signing-context';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { patch: jest.fn() },
}));

const mockedPatch = apiClient.patch as jest.Mock;

describe('public-signing-context', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedPatch.mockReset();
  });

  it('guarda en sessionStorage sólo documento, referencia y returnTo', () => {
    setPublicSigningContext('doc-1', 'c-1');

    expect(
      JSON.parse(sessionStorage.getItem('public-signing-context')!),
    ).toEqual({
      documentId: 'doc-1',
      invitationReference: 'c-1',
      returnTo: '/public/documents/doc-1/sign',
    });
    expect(localStorage.getItem('public-signing-context')).toBeNull();
  });

  it('descarta un returnTo manipulado (nunca redirige a otro sitio)', () => {
    sessionStorage.setItem(
      'public-signing-context',
      JSON.stringify({
        documentId: 'doc-1',
        invitationReference: 'c-1',
        returnTo: 'https://malicioso.example',
      }),
    );

    expect(getPublicSigningContext()).toBeNull();
  });

  it('clearPublicSigningContext lo elimina', () => {
    setPublicSigningContext('doc-1', 'c-1');
    clearPublicSigningContext();
    expect(getPublicSigningContext()).toBeNull();
  });

  it('linkInvitationRequest manda la referencia, nunca un correo', async () => {
    mockedPatch.mockResolvedValue({
      data: { data: { linked: true, outcome: 'LINKED' } },
    });

    await expect(linkInvitationRequest('doc-1', 'c-1')).resolves.toEqual({
      linked: true,
      outcome: 'LINKED',
    });
    expect(mockedPatch).toHaveBeenCalledWith(
      '/api/v1/document/doc-1/link-collaborator',
      { collaboratorId: 'c-1' },
    );
  });

  describe('resolvePublicSigningDestination', () => {
    it('sin contexto: null (el login sigue su camino de siempre)', async () => {
      await expect(resolvePublicSigningDestination()).resolves.toBeNull();
      expect(mockedPatch).not.toHaveBeenCalled();
    });

    it('vinculación confirmada: limpia el contexto y abre el documento en el dashboard', async () => {
      setPublicSigningContext('doc-1', 'c-1');
      mockedPatch.mockResolvedValue({
        data: { data: { linked: true, outcome: 'LINKED' } },
      });

      await expect(resolvePublicSigningDestination()).resolves.toBe(
        '/dashboard/documents/doc-1',
      );
      expect(getPublicSigningContext()).toBeNull();
    });

    it('cuenta que no corresponde: vuelve a la pantalla pública y conserva el contexto', async () => {
      setPublicSigningContext('doc-1', 'c-1');
      mockedPatch.mockResolvedValue({
        data: { data: { linked: false, outcome: 'ACCOUNT_MISMATCH' } },
      });

      await expect(resolvePublicSigningDestination()).resolves.toBe(
        '/public/documents/doc-1/sign',
      );
      expect(getPublicSigningContext()).not.toBeNull();
    });

    it('error de red: tampoco abre el dashboard', async () => {
      setPublicSigningContext('doc-1', 'c-1');
      mockedPatch.mockRejectedValue(new Error('network'));

      await expect(resolvePublicSigningDestination()).resolves.toBe(
        '/public/documents/doc-1/sign',
      );
    });
  });
});
