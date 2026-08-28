import { render, screen } from '@testing-library/react';
import CreateDocumentGuard from './CreateDocumentGuard';

jest.mock('./CreateDocumentView', () => ({
  __esModule: true,
  default: ({ trackDocumentsCount }: { trackDocumentsCount?: boolean }) => (
    <div>
      CreateDocumentView (trackDocumentsCount={String(trackDocumentsCount)})
    </div>
  ),
}));

describe('CreateDocumentGuard', () => {
  /**
   * Crear un documento dejó de depender del estado de identidad y firma del creador. Antes la
   * vista se renderizaba inerte (`inert`, `pointer-events-none`, opacidad reducida) con un
   * banner encima mientras el onboarding no estuviera completo; ahora se monta habilitada
   * siempre, sin consultar nada del usuario.
   */
  it('renderiza la vista habilitada, sin consultar el estado del usuario', () => {
    render(<CreateDocumentGuard />);

    const createDocumentView = screen.getByText(/CreateDocumentView/);

    expect(createDocumentView).toBeInTheDocument();
    expect(createDocumentView.closest('[aria-disabled]')).toBeNull();
    expect(createDocumentView.closest('[inert]')).toBeNull();
    expect(
      screen.getByText('CreateDocumentView (trackDocumentsCount=true)'),
    ).toBeInTheDocument();
  });

  /** El banner de onboarding desapareció: el aviso ahora vive junto al tipo de firma. */
  it('no muestra ningun banner de configuracion requerida', () => {
    render(<CreateDocumentGuard />);

    expect(
      screen.queryByText(/es requerido configurar tu usuario/i),
    ).not.toBeInTheDocument();
  });

  /**
   * Historia "Reubicar botón Invitar miembro": la gestión de usuarios del equipo se centralizó en
   * /dashboard/organization/settings/members, así que crear un documento ya no ofrece ese atajo.
   * Se afirma sin mockear nada: si alguien vuelve a montar el modal acá, esta prueba lo detecta
   * (un mock lo escondería detrás de un texto de reemplazo).
   */
  it('no ofrece "Invitar miembro": esa accion vive en Administrar miembros', () => {
    render(<CreateDocumentGuard />);

    expect(
      screen.queryByRole('button', { name: /invitar miembro/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/invitar miembro/i)).not.toBeInTheDocument();
  });
});
