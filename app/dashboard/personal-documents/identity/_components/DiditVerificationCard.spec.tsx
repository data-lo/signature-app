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
  it('coloca el inicio de la verificación a la derecha y muestra su icono', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationRequired);

    const action = screen.getByRole('button', {
      name: /iniciar verificación/i,
    });

    expect(action.parentElement).toHaveClass('flex', 'justify-end');
    expect(action.querySelector('svg')).toHaveClass('lucide-arrow-right');
  });

  it('centra la acción después de un rechazo', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationRetryRequired);

    const action = screen.getByRole('button', { name: /intentar nuevamente/i });

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

  it('coloca los detalles a la derecha cuando la identidad ya está validada', () => {
    renderCard(SigningCredentialStatus.Configured);

    const action = screen.getByRole('button', { name: 'Detalles' });

    expect(action.parentElement).toHaveClass('flex', 'justify-end');
  });

  /**
   * El QR y sus dos salidas ya venían centrados desde que se creó el panel; se afirma acá
   * también para que la tarjeta tenga una sola regla de composición en todos sus estados.
   */
  it('centra el QR mientras la verificación está en proceso', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationInProgress, {
      url: 'https://verify.didit.me/session/abc',
    } as CurrentIdentityVerification['verification']);

    const qr = screen.getByLabelText(/código qr para continuar/i);

    expect(qr.closest('div')?.parentElement).toHaveClass(
      'flex',
      'justify-center',
    );
    // El QR quedó como única salida: las acciones que lo acompañaban se retiraron (ver
    // `VerificationQrPanel`), así que ya no hay una segunda fila que centrar.
    expect(
      screen.queryByRole('link', { name: /abrir verificación/i }),
    ).not.toBeInTheDocument();
  });

  /** Título y descripción conservan su alineación: se leen de corrido, no se centran. */
  it('deja el título y la descripción alineados a la izquierda', () => {
    renderCard(SigningCredentialStatus.IdentityVerificationRequired);

    const title = screen.getByText('Validación de identidad');
    const description = screen.getByText(/verifica tu identidad con tu ine/i);

    expect(title.className).not.toMatch(/text-center|justify-center/);
    expect(description.className).not.toMatch(/text-center|justify-center/);
  });
});
