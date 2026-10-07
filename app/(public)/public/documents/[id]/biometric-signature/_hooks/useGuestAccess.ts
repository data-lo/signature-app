'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GuestAccess } from '../_requests';

/**
 * Llave del acceso de invitado de un documento en `sessionStorage`.
 *
 * @param documentId - Documento.
 * @returns La llave.
 *
 * @example
 * ```ts
 * guestAccessStorageKey('doc-1'); // 'biometric-guest-access:doc-1'
 * ```
 */
export function guestAccessStorageKey(documentId: string): string {
  return `biometric-guest-access:${documentId}`;
}

/**
 * Lee el acceso guardado si sigue vigente.
 *
 * @param documentId - Documento.
 * @param now - Instante de referencia; por defecto, el actual.
 * @returns El acceso, o `null` si no hay, venció o el almacenamiento no está disponible.
 *
 * @example
 * ```ts
 * readStoredGuestAccess('doc-1'); // { accessToken, expiresAt } | null
 * ```
 */
export function readStoredGuestAccess(
  documentId: string,
  now: number = Date.now(),
): GuestAccess | null {
  try {
    const raw = window.sessionStorage.getItem(
      guestAccessStorageKey(documentId),
    );
    if (!raw) return null;
    const access = JSON.parse(raw) as GuestAccess;
    return new Date(access.expiresAt).getTime() > now ? access : null;
  } catch {
    return null;
  }
}

/**
 * Acceso de invitado de esta pestaña para un documento.
 *
 * Vive en `sessionStorage`, no en `localStorage` ni en cookies: dura lo que la pestaña y vence a
 * los 30 minutos que firma el backend. Así una recarga no vuelve a pedir el código, pero cerrar la
 * pestaña o compartir la computadora no deja una firma abierta. Si el almacenamiento no está
 * disponible (modo privado estricto), el acceso vive sólo en memoria.
 *
 * @param documentId - Documento.
 * @returns El acceso vigente (o `null`), si ya se leyó el almacenamiento (`loaded`), y las funciones
 *   para guardarlo al canjear el código y olvidarlo cuando el backend lo rechaza.
 *
 * @example
 * ```ts
 * const { access, loaded, save, clear } = useGuestAccess('doc-1');
 * ```
 */
export function useGuestAccess(documentId: string) {
  const [access, setAccess] = useState<GuestAccess | null>(null);
  // `false` hasta leer `sessionStorage`: antes de eso no se sabe si hay acceso.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAccess(readStoredGuestAccess(documentId));
    setLoaded(true);
  }, [documentId]);

  const save = useCallback(
    (next: GuestAccess) => {
      setAccess(next);
      try {
        window.sessionStorage.setItem(
          guestAccessStorageKey(documentId),
          JSON.stringify(next),
        );
      } catch {
        // Sin almacenamiento: el acceso se queda sólo en memoria.
      }
    },
    [documentId],
  );

  const clear = useCallback(() => {
    setAccess(null);
    try {
      window.sessionStorage.removeItem(guestAccessStorageKey(documentId));
    } catch {
      // Nada que borrar.
    }
  }, [documentId]);

  return { access, loaded, save, clear };
}
