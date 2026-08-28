import { render, screen } from '@testing-library/react';
import DiditVerificationCard from './DiditVerificationCard';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import type { CurrentIdentityVerification } from '../_requests';

function build(
  status: SigningCredentialStatus,
  verification: CurrentIdentityVerification['verification'] = null,
): CurrentIdentityVerification {
  return {
    verification,
    signingCredentialStatus: status,
    signingCredentialConfigured:
      status === SigningCredentialStatus.Configured,
    identityVerifiedAt: null,
  } as CurrentIdentityVerification;
}

function renderCard(
  status: SigningCredentialStatus,
  verification: CurrentIdentityVerification['verification'] = null,
) {
  return render(
    <DiditVerificationCard
      data={build(status, verification)}
      onStart={() => {}}
      starting={false}
    />,
  );
}

/**
 * Distribución de la tarjeta de Didit: las acciones van centradas en el eje de la tarjeta y los
 * textos —título y descripción— se quedan a la izquierda.
 *
 * Se afirma sobre las clases porque jsdom no calcula layout. Alcanza para lo que se quiere
 * evitar: que alguien agregue un estado nuevo con la acción pegada al borde izquierdo, o que
 * quite el centrado de los que ya lo tienen.
 */
describe('DiditVerificationCard · distribución', () => {
  it.each([
    [
      'sin verificación iniciada',
      SigningCredentialStatus.IdentityVerificationRequired,
      /iniciar verificación/i,
    ],
    [
      'tras un rechazo',
      SigningCredentialStatus.IdentityVerificationRetryRequired,
      /intentar nuevamente/i,
    ],
  ])('centra la acción principal %s', (_caso, status, label) => {
    renderCard(status);

    const action = screen.getByRole('button', { name: label });

    expect(action.parentElement).toHaveClass('flex', 'justify-center');
  });

  /** La sesión expiró estando el usuario en la pantalla: no queda un QR muerto, sino la acción. */
  it('centra la acción cuando la sesión expiró', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationPending);

    const action = screen.getByRole('button', {
      name: /iniciar nueva verificación/i,
    });

    expect(action.parentElement).toHaveClass('flex', 'justify-center');
  });

  it('centra la acción de la identidad ya validada', () => {
    renderCard(SigningCredentialStatus.Configured);

    const action = screen.getByRole('button', { name: /ver detalle/i });

    expect(action.parentElement).toHaveClass('flex', 'justify-center');
  });

  /**
   * El QR y sus dos salidas ya venían centrados desde que se creó el panel; se afirma acá
   * también para que la tarjeta tenga una sola regla de composición en todos sus estados.
   */
  it('centra el QR y sus salidas mientras la verificación está en proceso', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationInProgress, {
      url: 'https://verify.didit.me/session/abc',
    } as CurrentIdentityVerification['verification']);

    const qr = screen.getByLabelText(/código qr para continuar/i);

    expect(qr.closest('div')?.parentElement).toHaveClass(
      'flex',
      'justify-center',
    );
    expect(
      screen.getByRole('link', { name: /abrir verificación/i }).parentElement,
    ).toHaveClass('flex', 'justify-center');
  });

  /** Título y descripción conservan su alineación: se leen de corrido, no se centran. */
  it('deja el título y la descripción alineados a la izquierda', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationRequired);

    const title = screen.getByText('Identidad con Didit');
    const description = screen.getByText(/captura tu ine/i);

    expect(title.className).not.toMatch(/text-center|justify-center/);
    expect(description.className).not.toMatch(/text-center|justify-center/);
  });
});
