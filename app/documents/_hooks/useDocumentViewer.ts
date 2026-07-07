'use client';

import { useCallback, useState } from 'react';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

// Controla el estado de renderizado del PDF: zoom y paginación.
// Aislado del ciclo de vida de negocio (firma/rechazo/cancelación) para que
// cambios de zoom o página no disparen renders innecesarios en la lógica de mutaciones.
export function useDocumentViewer() {
  const [scale, setScale] = useState(1.0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(+(s + ZOOM_STEP).toFixed(2), MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(+(s - ZOOM_STEP).toFixed(2), MIN_ZOOM));
  }, []);

  const handleLoadSuccess = useCallback((pages: number) => setNumPages(pages), []);
  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);

  return {
    scale,
    numPages,
    currentPage,
    canZoomIn: scale < MAX_ZOOM,
    canZoomOut: scale > MIN_ZOOM,
    zoomIn,
    zoomOut,
    handleLoadSuccess,
    handlePageChange,
  };
}
