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

  it('en una ruta estática muestra los niveles anteriores como links y el actual como no interactivo', () => {
    mockUsePathname.mockReturnValue(
      '/dashboard/organization/settings/permissions',
    );
    renderWithProviders(<DashboardBreadcrumbs />);

    const orgLink = screen.getByRole('link', { name: 'Organización' });
    expect(orgLink).toHaveAttribute(
      'href',
      '/dashboard/organization/settings/members',
    );

    const current = screen.getByText('Permisos');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('link', { name: 'Permisos' }),
    ).not.toBeInTheDocument();
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

  it('en el alta muestra "Documentos / Nuevo documento", con el padre enlazado al listado', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents/create');

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute(
      'href',
      '/dashboard/documents',
    );
    expect(screen.getByText('Nuevo documento')).toHaveAttribute(
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
