import { act, renderHook } from '@testing-library/react';
import { useDocumentFileSelection } from './useDocumentFileSelection';

function pdf(name = 'contrato.pdf') {
  return new File(['contenido'], name, { type: 'application/pdf' });
}

describe('useDocumentFileSelection', () => {
  it('arranca sin archivo y sin carga en curso', () => {
    const { result } = renderHook(() => useDocumentFileSelection());

    expect(result.current.file).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('guarda el archivo seleccionado', () => {
    const { result } = renderHook(() => useDocumentFileSelection());
    const file = pdf();

    act(() => result.current.select(file));

    expect(result.current.file).toBe(file);
  });

  it('refleja el estado de procesamiento del widget de carga', () => {
    const { result } = renderHook(() => useDocumentFileSelection());

    act(() => result.current.setLoading(true));
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.setLoading(false));
    expect(result.current.isLoading).toBe(false);
  });

  it('clear vuelve al estado inicial (se usa tras un envío exitoso)', () => {
    const { result } = renderHook(() => useDocumentFileSelection());

    act(() => {
      result.current.select(pdf());
      result.current.setLoading(true);
    });
    act(() => result.current.clear());

    expect(result.current.file).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('mantiene identidades estables de sus acciones (no re-suscribe a sus consumidores)', () => {
    const { result, rerender } = renderHook(() => useDocumentFileSelection());
    const { select, setLoading, clear } = result.current;

    rerender();

    expect(result.current.select).toBe(select);
    expect(result.current.setLoading).toBe(setLoading);
    expect(result.current.clear).toBe(clear);
  });
});
