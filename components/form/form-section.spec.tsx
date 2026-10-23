import { renderWithProviders, screen } from '@/test-utils';
import { FormSection } from './form-section';

describe('FormSection', () => {
  it('habilitada: muestra el contenido sin atenuarlo ni bloquearlo', () => {
    renderWithProviders(
      <FormSection title="Participantes">
        <button type="button">Agregar firmante</button>
      </FormSection>,
    );

    const action = screen.getByRole('button', { name: /agregar firmante/i });
    expect(action).toBeInTheDocument();
    expect(action.closest('[inert]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Participantes' })).toBeInTheDocument();
  });

  it('deshabilitada: bloquea el contenido y explica qué requisito falta', () => {
    renderWithProviders(
      <FormSection
        isEnabled={false}
        missingRequirementMessage="Carga un documento para continuar"
      >
        <button type="button">Agregar firmante</button>
      </FormSection>,
    );

    expect(
      screen.getByText('Carga un documento para continuar'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /agregar firmante/i }).closest('[inert]'),
    ).not.toBeNull();
  });

  it('en carga: anuncia el estado con aria-busy y el mensaje correspondiente', () => {
    const { container } = renderWithProviders(
      <FormSection isLoading loadingMessage="Cargando tus documentos...">
        <p>Contenido</p>
      </FormSection>,
    );

    expect(screen.getByText('Cargando tus documentos...')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('con error: lo publica como alerta', () => {
    renderWithProviders(
      <FormSection hasError errorMessage="No se pudo cargar la sección">
        <p>Contenido</p>
      </FormSection>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la sección',
    );
  });

  it('el requisito faltante solo se muestra si la sección está deshabilitada', () => {
    renderWithProviders(
      <FormSection missingRequirementMessage="Carga un documento">
        <p>Contenido</p>
      </FormSection>,
    );

    expect(screen.queryByText('Carga un documento')).not.toBeInTheDocument();
  });
});
