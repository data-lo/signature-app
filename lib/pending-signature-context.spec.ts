import {
  setPendingSignatureContext,
  getPendingSignatureContext,
  clearPendingSignatureContext,
} from './pending-signature-context';

describe('pending-signature-context', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarda y recupera el contexto guardado', () => {
    setPendingSignatureContext({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'juan@correo.com',
    });

    expect(getPendingSignatureContext()).toEqual({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'juan@correo.com',
    });
  });

  it('retorna null si no hay ningún contexto guardado', () => {
    expect(getPendingSignatureContext()).toBeNull();
  });

  it('retorna null si el contenido guardado no tiene la forma esperada', () => {
    localStorage.setItem(
      'pending_signature_context',
      JSON.stringify({ documentId: 'doc-1' }),
    );

    expect(getPendingSignatureContext()).toBeNull();
  });

  it('retorna null si el contenido guardado no es JSON válido', () => {
    localStorage.setItem('pending_signature_context', 'no-es-json');

    expect(getPendingSignatureContext()).toBeNull();
  });

  it('clearPendingSignatureContext elimina el contexto guardado', () => {
    setPendingSignatureContext({
      documentId: 'doc-1',
      collaboratorId: 'collab-1',
      email: 'juan@correo.com',
    });

    clearPendingSignatureContext();

    expect(getPendingSignatureContext()).toBeNull();
  });
});
