'use client';

import dynamic from 'next/dynamic';
import { useDocumentLifecycle } from '../_hooks/useDocumentLifecycle';
import { useDocumentViewer } from '../_hooks/useDocumentViewer';
import StatusBanner, { COMPLETED_BANNERS, STATUS_BANNERS } from './StatusBanner';
import Toolbar from './Toolbar';
import VerificationModal from './VerificationModal';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

interface DocumentViewerProps {
  documentUrl: string;
  documentId: string;
  signerId: string;
  apiKey: string;
  documentStatus: string;
}

// Componente de composición: ensambla Toolbar, StatusBanner, PdfViewer y
// VerificationModal a partir del estado expuesto por useDocumentViewer
// (render/zoom) y useDocumentLifecycle (negocio: firma/rechazo/cancelación).
export default function DocumentViewer({
  documentUrl,
  documentId,
  signerId,
  apiKey,
  documentStatus,
}: DocumentViewerProps) {
  const viewer = useDocumentViewer();
  const lifecycle = useDocumentLifecycle({ apiKey, documentId, signerId });

  const zoom = {
    scale: viewer.scale,
    numPages: viewer.numPages,
    currentPage: viewer.currentPage,
    canZoomIn: viewer.canZoomIn,
    canZoomOut: viewer.canZoomOut,
    onZoomIn: viewer.zoomIn,
    onZoomOut: viewer.zoomOut,
  };

  // COMPLETED ACTION VIEW — sign/reject/cancel just succeeded in this session
  if (lifecycle.completedAction !== null) {
    const banner = COMPLETED_BANNERS[lifecycle.completedAction];
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <StatusBanner config={banner} />
        <Toolbar title={banner.navTitle} zoom={zoom} />

        {lifecycle.loadingProcessedDoc ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-gray-500">Cargando documento...</p>
            </div>
          </div>
        ) : lifecycle.processedDocumentUrl ? (
          <PdfViewer
            url={lifecycle.processedDocumentUrl}
            scale={viewer.scale}
            onLoadSuccess={viewer.handleLoadSuccess}
            onPageChange={viewer.handlePageChange}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-500">El documento está siendo procesado.</p>
          </div>
        )}
      </div>
    );
  }

  // READ-ONLY VIEW — document already rejected or cancelled before this session
  if (documentStatus === 'rejected' || documentStatus === 'cancelled') {
    const banner = STATUS_BANNERS[documentStatus];
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <StatusBanner config={banner} />
        <Toolbar title={banner.navTitle} zoom={zoom} />

        <PdfViewer
          url={documentUrl}
          scale={viewer.scale}
          onLoadSuccess={viewer.handleLoadSuccess}
          onPageChange={viewer.handlePageChange}
        />
      </div>
    );
  }

  // MAIN INTERACTIVE VIEW
  const showSignRejectButtons = documentStatus === 'pending';
  const showCancelButton = documentStatus === 'signed' || documentStatus === 'cancellation_pending';

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toolbar title="Visor de Documentos" zoom={zoom}>
        {lifecycle.generateMutation.isError && (
          <p className="text-sm text-red-600">{lifecycle.generateMutation.error?.message}</p>
        )}

        {showSignRejectButtons && (
          <>
            <button
              onClick={() => lifecycle.handleAction('sign')}
              disabled={lifecycle.isBusy}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {lifecycle.generateMutation.isPending && lifecycle.actionType === 'sign'
                ? 'Enviando código...'
                : 'Firmar'}
            </button>
            <button
              onClick={() => lifecycle.handleAction('reject')}
              disabled={lifecycle.isBusy}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {lifecycle.generateMutation.isPending && lifecycle.actionType === 'reject'
                ? 'Enviando código...'
                : 'Rechazar'}
            </button>
          </>
        )}

        {showCancelButton && (
          <button
            onClick={() => lifecycle.handleAction('cancel')}
            disabled={lifecycle.isBusy}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {lifecycle.submitCancelMutation.isPending
              ? 'Iniciando...'
              : lifecycle.generateMutation.isPending && lifecycle.actionType === 'cancel'
                ? 'Enviando código...'
                : 'Cancelar'}
          </button>
        )}
      </Toolbar>

      <PdfViewer
        url={documentUrl}
        scale={viewer.scale}
        onLoadSuccess={viewer.handleLoadSuccess}
        onPageChange={viewer.handlePageChange}
      />

      {lifecycle.showModal && (
        <VerificationModal
          actionType={lifecycle.actionType}
          code={lifecycle.code}
          onChangeCode={lifecycle.setCode}
          onValidate={lifecycle.handleValidate}
          onClose={lifecycle.handleCloseModal}
          onRequestNewCode={lifecycle.handleRequestNewCode}
          isBusy={lifecycle.isBusy}
          isValidating={lifecycle.validateMutation.isPending}
          isGeneratingNewCode={lifecycle.generateMutation.isPending}
          errorMessage={lifecycle.validateMutation.error?.message}
          isExpiredCode={lifecycle.isExpiredCode}
        />
      )}
    </div>
  );
}
