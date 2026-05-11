'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMutation } from '@tanstack/react-query';
import { generateVerificationCode, validateCode, fetchDocumentUrl, submitForCancellation } from '../actions';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

type ActionType = 'sign' | 'reject' | 'cancel';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

interface DocumentViewerProps {
  documentUrl: string;
  documentId: string;
  signerId: string;
  apiKey: string;
  documentStatus: string;
}

function toCodeType(action: ActionType): 'VERIFICATION' | 'REJECTION' | 'CANCELLATION' {
  if (action === 'sign') return 'VERIFICATION';
  if (action === 'reject') return 'REJECTION';
  return 'CANCELLATION';
}

function getModalTitle(action: ActionType): string {
  if (action === 'sign') return 'Verificar firma';
  if (action === 'reject') return 'Verificar rechazo';
  return 'Verificar cancelación';
}

interface BannerConfig {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  subtitleColor: string;
  title: string;
  subtitle: string;
  navTitle: string;
  iconType: 'check' | 'x';
}

const COMPLETED_BANNERS: Record<ActionType, BannerConfig> = {
  sign: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    subtitleColor: 'text-green-600',
    title: 'Documento firmado exitosamente',
    subtitle: 'La firma ha sido estampada en el documento.',
    navTitle: 'Documento Firmado',
    iconType: 'check',
  },
  reject: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-800',
    subtitleColor: 'text-orange-600',
    title: 'Documento rechazado',
    subtitle: 'El documento ha sido rechazado exitosamente.',
    navTitle: 'Documento Rechazado',
    iconType: 'x',
  },
  cancel: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-600',
    title: 'Documento cancelado',
    subtitle: 'El documento firmado ha sido cancelado exitosamente.',
    navTitle: 'Documento Cancelado',
    iconType: 'x',
  },
};

const STATUS_BANNERS: Record<string, BannerConfig> = {
  rejected: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-800',
    subtitleColor: 'text-orange-600',
    title: 'Este documento fue rechazado',
    subtitle: 'No es posible realizar acciones sobre este documento.',
    navTitle: 'Documento Rechazado',
    iconType: 'x',
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-600',
    title: 'Este documento fue cancelado',
    subtitle: 'No es posible realizar acciones sobre este documento.',
    navTitle: 'Documento Cancelado',
    iconType: 'x',
  },
};

function StatusBanner({ config }: { config: BannerConfig }) {
  return (
    <div className={`${config.bg} border-b ${config.border} px-6 py-3 flex items-center gap-3 flex-shrink-0`}>
      <div className={`w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        {config.iconType === 'check' ? (
          <svg className={`w-5 h-5 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div>
        <p className={`font-semibold ${config.titleColor}`}>{config.title}</p>
        <p className={`text-sm ${config.subtitleColor}`}>{config.subtitle}</p>
      </div>
    </div>
  );
}

export default function DocumentViewer({ documentUrl, documentId, signerId, apiKey, documentStatus }: DocumentViewerProps) {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('sign');
  const [code, setCode] = useState('');
  const [completedAction, setCompletedAction] = useState<ActionType | null>(null);
  const [scale, setScale] = useState(1.0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [processedDocumentUrl, setProcessedDocumentUrl] = useState<string | null>(null);
  const [loadingProcessedDoc, setLoadingProcessedDoc] = useState(false);

  const loadProcessedDocument = useCallback(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      try {
        const url = await fetchDocumentUrl({ apiKey, documentId });
        setProcessedDocumentUrl(url);
        setLoadingProcessedDoc(false);
        return;
      } catch {
        // retry
      }
    }
    setLoadingProcessedDoc(false);
  }, [apiKey, documentId]);

  const generateMutation = useMutation({
    mutationFn: (action: ActionType) =>
      generateVerificationCode({ documentId, signerId: signerId, type: toCodeType(action) }),
    onSuccess: () => {
      setShowModal(true);
      setCode('');
    },
  });

  const validateMutation = useMutation({
    mutationFn: (vars: { code: string; action: ActionType }) =>
      validateCode({ documentId, signerId: signerId, code: vars.code, type: toCodeType(vars.action) }),
    onSuccess: (_, vars) => {
      setShowModal(false);
      setCode('');
      setCompletedAction(vars.action);
      setLoadingProcessedDoc(true);
      loadProcessedDocument();
    },
  });

  const submitCancelMutation = useMutation({
    mutationFn: () => submitForCancellation({ apiKey, documentId }),
    onSettled: () => {
      generateMutation.mutate('cancel');
    },
  });

  const isBusy = generateMutation.isPending || validateMutation.isPending || submitCancelMutation.isPending;
  const isExpiredCode = validateMutation.error?.message === 'Código expirado';

  const handleAction = (action: ActionType) => {
    setActionType(action);
    validateMutation.reset();
    generateMutation.reset();
    if (action === 'cancel') {
      submitCancelMutation.reset();
      submitCancelMutation.mutate();
    } else {
      generateMutation.mutate(action);
    }
  };

  const handleValidate = () => {
    if (!code.trim()) return;
    validateMutation.mutate({ code: code.trim(), action: actionType });
  };

  const handleRequestNewCode = () => {
    validateMutation.reset();
    setCode('');
    generateMutation.mutate(actionType);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCode('');
    validateMutation.reset();
  };

  const zoomIn = () => setScale((s) => Math.min(+(s + ZOOM_STEP).toFixed(2), MAX_ZOOM));
  const zoomOut = () => setScale((s) => Math.max(+(s - ZOOM_STEP).toFixed(2), MIN_ZOOM));

  const handleLoadSuccess = useCallback((pages: number) => setNumPages(pages), []);
  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);

  const ZoomControls = (
    <div className="flex items-center gap-2">
      <button
        onClick={zoomOut}
        disabled={scale <= MIN_ZOOM}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        aria-label="Reducir zoom"
      >
        −
      </button>
      <span className="text-sm font-medium text-gray-700 w-14 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={zoomIn}
        disabled={scale >= MAX_ZOOM}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        aria-label="Aumentar zoom"
      >
        +
      </button>
      {numPages > 0 && (
        <span className="text-sm text-gray-500 ml-2 w-20 text-center">
          {currentPage} / {numPages}
        </span>
      )}
    </div>
  );

  // COMPLETED ACTION VIEW — sign/reject/cancel just succeeded in this session
  if (completedAction !== null) {
    const banner = COMPLETED_BANNERS[completedAction];
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <StatusBanner config={banner} />

        <nav className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">{banner.navTitle}</h1>
              {ZoomControls}
            </div>
          </div>
        </nav>

        {loadingProcessedDoc ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-gray-500">Cargando documento...</p>
            </div>
          </div>
        ) : processedDocumentUrl ? (
          <PdfViewer
            url={processedDocumentUrl}
            scale={scale}
            onLoadSuccess={handleLoadSuccess}
            onPageChange={handlePageChange}
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

        <nav className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">{banner.navTitle}</h1>
              {ZoomControls}
            </div>
          </div>
        </nav>

        <PdfViewer
          url={documentUrl}
          scale={scale}
          onLoadSuccess={handleLoadSuccess}
          onPageChange={handlePageChange}
        />
      </div>
    );
  }

  // MAIN INTERACTIVE VIEW
  const showSignRejectButtons = documentStatus === 'pending';
  const showCancelButton = documentStatus === 'signed' || documentStatus === 'cancellation_pending';

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Visor de Documentos</h1>

            {ZoomControls}

            <div className="flex items-center gap-4 flex-shrink-0">
              {generateMutation.isError && (
                <p className="text-sm text-red-600">{generateMutation.error?.message}</p>
              )}

              {showSignRejectButtons && (
                <>
                  <button
                    onClick={() => handleAction('sign')}
                    disabled={isBusy}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {generateMutation.isPending && actionType === 'sign' ? 'Enviando código...' : 'Firmar'}
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={isBusy}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {generateMutation.isPending && actionType === 'reject' ? 'Enviando código...' : 'Rechazar'}
                  </button>
                </>
              )}

              {showCancelButton && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={isBusy}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitCancelMutation.isPending
                    ? 'Iniciando...'
                    : generateMutation.isPending && actionType === 'cancel'
                      ? 'Enviando código...'
                      : 'Cancelar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <PdfViewer
        url={documentUrl}
        scale={scale}
        onLoadSuccess={handleLoadSuccess}
        onPageChange={handlePageChange}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {getModalTitle(actionType)}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Se ha enviado un código de verificación a tu correo electrónico.
              </p>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isBusy && code.trim()) handleValidate();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest text-gray-900 placeholder:text-gray-300"
                placeholder="Código de verificación"
                disabled={isBusy}
                maxLength={6}
                autoFocus
              />

              {validateMutation.isError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    {isExpiredCode
                      ? 'El código ha expirado.'
                      : validateMutation.error?.message}
                  </p>
                  {isExpiredCode && (
                    <button
                      onClick={handleRequestNewCode}
                      disabled={generateMutation.isPending}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 underline"
                    >
                      {generateMutation.isPending ? 'Enviando...' : 'Solicitar nuevo código'}
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleValidate}
                  disabled={isBusy || !code.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {validateMutation.isPending ? 'Validando...' : 'Validar'}
                </button>
                <button
                  onClick={handleCloseModal}
                  disabled={isBusy}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
