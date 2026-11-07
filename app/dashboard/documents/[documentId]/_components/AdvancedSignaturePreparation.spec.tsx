import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedSignaturePreparation, {
  FIEL_SECURITY_MESSAGE,
} from './AdvancedSignaturePreparation';

describe('AdvancedSignaturePreparation', () => {
  it('muestra los textos de FIEL, los requisitos y el mensaje de seguridad', () => {
    render(<AdvancedSignaturePreparation />);

    expect(
      screen.getByRole('heading', { name: 'Prepara tu FIEL para continuar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ten lista tu FIEL:')).toBeInTheDocument();
    expect(screen.getByText('Certificado (.cer)')).toBeInTheDocument();
    expect(screen.getByText('Llave privada (.key)')).toBeInTheDocument();
    expect(screen.getByText('Contraseña de FIEL')).toBeInTheDocument();
    expect(screen.getByText(FIEL_SECURITY_MESSAGE)).toBeInTheDocument();
  });

  it('no pide confirmar nada ni menciona la nomenclatura anterior', () => {
    const { container } = render(
      <AdvancedSignaturePreparation certificateChecks={['Vigente']} />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/e\.firma|avanzada/i);
  });

  /** El `.cer` se conserva como evidencia de la firma: el mensaje no debe prometer lo contrario. */
  it('el mensaje de seguridad no promete borrar el certificado', () => {
    expect(FIEL_SECURITY_MESSAGE).not.toMatch(/certificado|archivos|\.cer/i);
  });

  it('sin validaciones activas no muestra la sección desplegable', () => {
    render(<AdvancedSignaturePreparation certificateChecks={[]} />);

    expect(
      screen.queryByRole('button', { name: /validaciones/i }),
    ).not.toBeInTheDocument();
  });

  it('las validaciones empiezan contraídas y se abren también con el teclado', async () => {
    const user = userEvent.setup();
    render(
      <AdvancedSignaturePreparation
        certificateChecks={['Que el SAT no lo haya revocado']}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Validaciones que haremos a tu certificado',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByText('Que el SAT no lo haya revocado'),
    ).not.toBeVisible();

    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByText('Que el SAT no lo haya revocado'),
    ).toBeVisible();
  });
});
