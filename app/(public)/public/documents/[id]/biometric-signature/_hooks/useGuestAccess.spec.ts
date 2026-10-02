import { act, renderHook } from '@testing-library/react';
import {
  guestAccessStorageKey,
  readStoredGuestAccess,
  useGuestAccess,
} from './useGuestAccess';

const FUTURE = new Date(Date.now() + 10 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

describe('useGuestAccess', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('guarda el acceso sólo en sessionStorage (nunca en localStorage ni cookies)', () => {
    const { result } = renderHook(() => useGuestAccess('doc-1'));

    act(() => result.current.save({ accessToken: 't-1', expiresAt: FUTURE }));

    expect(result.current.access?.accessToken).toBe('t-1');
    expect(sessionStorage.getItem(guestAccessStorageKey('doc-1'))).toContain(
      't-1',
    );
    expect(JSON.stringify({ ...localStorage })).not.toContain('t-1');
    expect(document.cookie).not.toContain('t-1');
  });

  it('una recarga recupera el acceso vigente', () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({ accessToken: 't-1', expiresAt: FUTURE }),
    );

    const { result } = renderHook(() => useGuestAccess('doc-1'));

    expect(result.current.loaded).toBe(true);
    expect(result.current.access?.accessToken).toBe('t-1');
  });

  it('un acceso vencido no se recupera', () => {
    sessionStorage.setItem(
      guestAccessStorageKey('doc-1'),
      JSON.stringify({ accessToken: 't-1', expiresAt: PAST }),
    );

    expect(readStoredGuestAccess('doc-1')).toBeNull();
  });

  it('el acceso de un documento no sirve para otro', () => {
    const { result } = renderHook(() => useGuestAccess('doc-1'));
    act(() => result.current.save({ accessToken: 't-1', expiresAt: FUTURE }));

    expect(readStoredGuestAccess('doc-2')).toBeNull();
  });

  it('clear lo olvida', () => {
    const { result } = renderHook(() => useGuestAccess('doc-1'));
    act(() => result.current.save({ accessToken: 't-1', expiresAt: FUTURE }));
    act(() => result.current.clear());

    expect(result.current.access).toBeNull();
    expect(readStoredGuestAccess('doc-1')).toBeNull();
  });
});
