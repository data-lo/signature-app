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

  it('en el detalle de un documento usa el nombre del archivo como último nivel una vez cargado', () => {
    mockUsePathname.mockReturnValue('/dashboard/documents/doc-1');
    mockedUseDocumentDetail.mockReturnValue({
      data: { fileName: 'contrato.pdf' },
    });

    renderWithProviders(<DashboardBreadcrumbs />);

    expect(
      screen.queryByRole('link', { name: 'Documentos' }),
    ).not.toBeInTheDocument();
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

  it.each([
    ['/dashboard/documents/create', 'Nuevo documento'],
    ['/dashboard/documents/to-sign', 'Por firmar'],
    ['/dashboard/documents/sent', 'Enviados para firma'],
    ['/dashboard/documents/completed', 'Completados'],
  ])(
    'en %s muestra "Documentos / %s": el agrupador sin enlace y la sección como página actual',
    (pathname, sectionLabel) => {
      mockUsePathname.mockReturnValue(pathname);

      renderWithProviders(<DashboardBreadcrumbs />);

      const group = screen.getByText('Documentos');
      expect(group).toHaveAttribute('aria-disabled', 'true');
      expect(group).not.toHaveAttribute('aria-current');
      expect(
        screen.queryByRole('link', { name: 'Documentos' }),
      ).not.toBeInTheDocument();

      expect(screen.getByText(sectionLabel)).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(
        screen.queryByRole('link', { name: sectionLabel }),
      ).not.toBeInTheDocument();

      // Bug corregido: cada sección es un solo segmento bajo /dashboard/documents, así que
      // también matchea el patrón del detalle — no debe dispararse ningún GET /document/:id.
      expect(mockedUseDocumentDetail).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it.each([
    ['/dashboard/documents', 'Por firmar'],
    ['/dashboard/documents/created', 'Enviados para firma'],
  ])(
    'la ruta anterior %s muestra el breadcrumb de su ruta nueva mientras redirige, sin interpretarla como id de documento',
    (legacyPathname, sectionLabel) => {
      mockUsePathname.mockReturnValue(legacyPathname);

      renderWithProviders(<DashboardBreadcrumbs />);

      expect(screen.getByText(sectionLabel)).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(mockedUseDocumentDetail).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it('no renderiza nada para una ruta sin breadcrumbs configurados', () => {
    mockUsePathname.mockReturnValue('/dashboard/unknown-route');

    const { container } = renderWithProviders(<DashboardBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });
});
