'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Cuánto por encima y por debajo del área visible se considera "cerca". En porcentaje del alto
 * del contenedor: con 150% se dibujan de antemano unas pantallas y media hacia cada lado, así que
 * al hacer scroll normal la página ya está lista cuando aparece.
 */
export const NEAR_VIEWPORT_MARGIN = '150% 0px';

/**
 * Indica si un elemento está dentro (o cerca) del área visible de su contenedor con scroll.
 *
 * El contenedor se pasa explícitamente como raíz del `IntersectionObserver`: los visores de PDF
 * hacen scroll dentro de su propio panel (`overflow-y-auto`), y con la ventana como raíz el
 * margen no alcanzaría a las páginas que el panel recorta justo debajo de lo visible — sólo se
 * dibujarían al asomarse, que es precisamente el parpadeo que se quiere evitar.
 *
 * Sin `IntersectionObserver` (jsdom, navegadores muy viejos) devuelve siempre `true`: dibujar
 * todo es el comportamiento anterior, más lento pero correcto.
 *
 * @param targetRef - Elemento a observar.
 * @param rootRef - Contenedor con scroll que hace de raíz; si todavía no existe se usa la ventana.
 * @param rootMargin - Margen alrededor del área visible (formato CSS de `rootMargin`).
 * @returns `true` mientras el elemento esté dentro del área visible más el margen.
 *
 * @example
 * ```ts
 * const isNear = useNearViewport(pageRef, scrollContainerRef);
 * return isNear ? <Page pageNumber={3} /> : <Placeholder />;
 * ```
 */
export function useNearViewport(
  targetRef: RefObject<Element | null>,
  rootRef: RefObject<Element | null>,
  rootMargin: string = NEAR_VIEWPORT_MARGIN,
): boolean {
  const isSupported = typeof IntersectionObserver !== 'undefined';
  const [isNear, setIsNear] = useState(!isSupported);

  useEffect(() => {
    const target = targetRef.current;
    if (!isSupported || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setIsNear(entry.isIntersecting);
      },
      { root: rootRef.current, rootMargin },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [isSupported, targetRef, rootRef, rootMargin]);

  return isNear;
}
