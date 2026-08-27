import { render, screen } from '@testing-library/react';
import SigningCredentialWarning, {
  IDENTITY_SETUP_PATH,
} from './SigningCredentialWarning';

describe('SigningCredentialWarning', () => {
  it('muestra el mensaje recibido', () => {
    render(<SigningCredentialWarning message="Falta configurar tu firma." />);

    expect(screen.getByText('Falta configurar tu firma.')).toBeInTheDocument();
  });

  it('sin actionLabel no ofrece ningun enlace', () => {
    render(<SigningCredentialWarning message="Falta configurar tu firma." />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('con actionLabel enlaza a la pantalla de identidad y firma', () => {
    render(
      <SigningCredentialWarning
        message="Falta configurar tu firma."
        actionLabel="Configura aquí."
      />,
    );

    const link = screen.getByRole('link', { name: 'Configura aquí.' });

    expect(link).toHaveAttribute('href', IDENTITY_SETUP_PATH);
  });

  /**
   * Es un aviso, no un error: se anuncia como `status` para que los lectores de pantalla lo
   * lean sin interrumpir lo que el usuario esté haciendo.
   */
  it('se anuncia como status y no bloquea nada', () => {
    render(<SigningCredentialWarning message="Falta configurar tu firma." />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
