import { renderWithProviders, screen } from '@/test-utils';
import DashboardBreadcrumbs from './DashboardBreadcrumbs';
import { useDocumentDetail } from '../documents/[documentId]/_hooks/useDocumentDetail';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));
jest.mock('../documents/[documentId]/_hooks/useDocumentDetail');

const mockedUseDocumentDetail = useDocumentDetail as jest.Mock;

describe('DashboardBreadcrumbs', () => {
  beforeEach(() => {
    mockedUseDocumentDetail.mockReturnValue({ data: undefined });
  });

  /**
   * "Organización" dejó de ser un enlace al mudarse Administrar miembros a una ruta que lleva el
   * `organizationId`: ya no hay una URL fija a la que llevar, así que es un agrupador sin página
   * propia. Antes apuntaba a la ruta de miembros, que ya no existe.
   */
  it('en una ruta estática muestra el agrupador sin enlace y el nivel actual como no interactivo', () => {
    mockUsePathname.mockReturnValue(
      '/dashboard/organization/settings/permissions',
    );
    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByText('Organización')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      screen.queryByRole('link', { name: 'Organización' }),
    ).not.toBeInTheDocument();

    const current = screen.getByText('Permisos');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('link', { name: 'Permisos' }),
    ).not.toBeInTheDocument();
  });

  /**
   * La ruta de Administrar miembros lleva el id de la organización, así que no puede entrar en el
   * mapa estático de breadcrumbs y se resuelve por patrón. Sin esta prueba, la sección quedaría
   * sin ningún breadcrumb y nadie lo notaría hasta verlo en pantalla.
   */
  it('resuelve por patrón los breadcrumbs de Administrar miembros, con el id en la ruta', () => {
    mockUsePathname.mockReturnValue(
      '/dashboard/organizations/org-1/members',
    );

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByText('Organización')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText('Administrar miembros')).toHaveAttribute(
      'aria-current',
      'page',
    );
    // El id de la organización es plomería de la ruta, no un nivel que el usuario reconozca.
    expect(screen.queryByText('org-1')).not.toBeInTheDocument();
  });

  /**
   * "Documentos" pasó de agrupador muerto a enlace: mientras el módulo estuvo partido en tres
   * secciones no había ninguna pantalla de "Documentos" a la que llevar, y ahora sí.
   */
  it('en el detalle de un documento usa el nombre del archivo como último nivel una vez cargado', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents/doc-1');
    mockedUseDocumentDetail.mockReturnValue({
      data: { fileName: 'contrato.pdf' },
    });

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute(
      'href',
      '/dashboard/documents',
    );
    expect(screen.getByText('contrato.pdf')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('mientras el documento no cargó, muestra una etiqueta genérica en vez del id crudo', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents/doc-1');

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByText('Detalle del documento')).toBeInTheDocument();
    expect(screen.queryByText('doc-1')).not.toBeInTheDocument();
  });

  /** El listado es el nivel padre: repetirlo como hijo diría "Documentos / Documentos". */
  it('en el listado unificado muestra un solo nivel, y es la página actual', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents');

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByText('Documentos')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.queryByRole('link', { name: 'Documentos' }),
    ).not.toBeInTheDocument();
  });

  it('en el alta muestra "Documentos / Crear documento", con el padre enlazado al listado', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents/create');

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute(
      'href',
      '/dashboard/documents',
    );
    expect(screen.getByText('Crear documento')).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Bug corregido: `/create` es un solo segmento bajo /dashboard/documents, así que también
    // matchea el patrón del detalle — no debe dispararse ningún GET /document/:id.
    expect(mockedUseDocumentDetail).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
  });

  it('no renderiza nada para una ruta sin breadcrumbs configurados', () => {
    mockUsePathname.mockReturnValue('/dashboard/unknown-route');

    const { container } = renderWithProviders(<DashboardBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });
});
