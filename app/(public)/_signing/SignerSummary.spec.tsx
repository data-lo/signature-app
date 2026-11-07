import { render, screen } from '@testing-library/react';
import SignerSummary from './SignerSummary';
import type { SigningSession } from './signing-session';

jest.mock('./SigningSessionProvider', () => ({
  useSigningSession: () => ({ result: null }),
}));

function session(type: 'SIMPLE' | 'ADVANCED' | 'BIOMETRIC') {
  return {
    document: { name: 'contrato.pdf' },
    signature: { type },
  } as unknown as SigningSession;
}

describe('SignerSummary', () => {
  it('nombra FIEL como método de firma, sin la nomenclatura anterior', () => {
    render(<SignerSummary session={session('ADVANCED')} />);

    const summary = screen.getByRole('region', {
      name: /resumen de la firma/i,
    });
    expect(summary).toHaveTextContent('Método de firma: FIEL');
    expect(summary).not.toHaveTextContent(/e\.firma|avanzada/i);
  });

  it.each([
    ['SIMPLE', 'Método de firma: Simple'],
    ['BIOMETRIC', 'Método de firma: Biometría'],
  ] as const)('%s conserva su nombre', (type, text) => {
    render(<SignerSummary session={session(type)} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
