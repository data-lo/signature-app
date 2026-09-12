import { act, renderHook } from '@testing-library/react';
import { useDocumentsListState } from './useDocumentsListState';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { DocumentView } from '@/lib/enums/document';
import { DEFAULT_DOCUMENTS_FILTERS } from '../_config/filters';

const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

function givenActiveAccount(id: string, organizationId: string | null = null) {
  useAuthStore.setState({
    activeAccount: {
      id,
      accountType: organizationId ? 'ORGANIZATION' : 'PERSONAL',
      organizationId,
      roleId: null,
    },
  });
}

describe('useDocumentsListState', () => {
  beforeEach(() => {
    givenActiveAccount('account-1');
  });

  /**
   * Bug: "El listado de documentos no se actualiza al cambiar de cuenta activa". Con la página
   * anterior en pie, cambiar de cuenta pide la 3 de una bandeja que puede tener una sola, y el
   * listado sale vacío — que en pantalla se lee como "esta cuenta no tiene documentos".
   */
  it('vuelve a la primera página al cambiar de cuenta activa', () => {
    const { result, rerender } = renderHook(() => useDocumentsListState());
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => givenActiveAccount('account-2', 'org-1'));
    rerender();

    expect(result.current.page).toBe(1);
  });

  /**
   * Los filtros son cómo quiere mirar quien está mirando, y esa preferencia no cambia porque
   * cambie el contexto: reiniciarlos devolvería la vista por omisión a media revisión.
   */
  it('conserva los filtros al cambiar de cuenta activa', () => {
    const { result, rerender } = renderHook(() => useDocumentsListState());
    act(() =>
      result.current.handleFiltersChange({
        ...DEFAULT_DOCUMENTS_FILTERS,
        view: DocumentView.Completed,
        search: 'contrato',
      }),
    );

    act(() => givenActiveAccount('account-2', 'org-1'));
    rerender();

    expect(result.current.filters).toEqual({
      ...DEFAULT_DOCUMENTS_FILTERS,
      view: DocumentView.Completed,
      search: 'contrato',
    });
  });

  it('cambiar de filtro también vuelve a la primera página', () => {
    const { result } = renderHook(() => useDocumentsListState());
    act(() => result.current.setPage(2));

    act(() =>
      result.current.handleFiltersChange({
        ...DEFAULT_DOCUMENTS_FILTERS,
        view: DocumentView.All,
      }),
    );

    expect(result.current.page).toBe(1);
  });
});
