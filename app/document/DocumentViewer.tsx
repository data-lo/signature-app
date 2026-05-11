'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMutation } from '@tanstack/react-query';
import { generateVerificationCode, validateCode, fetchDocumentUrl } from '../actions';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

type ActionType = 'sign' | 'reject';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

interface DocumentViewerProps {
  documentUrl: string;
  documentId: string;
  userId: string;
  apiKey: string;
}

function toCodeType(action: ActionType): 'VERIFICATION' | 'REJECTION' {
  return action === 'sign' ? 'VERIFICATION' : 'REJECTION';
}

export default function DocumentViewer({ documentUrl, documentId, userId, apiKey }: DocumentViewerProps) {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('sign');
  const [code, setCode] = useState('');
  const [completedAction, setCompletedAction] = useState<ActionType | null>(null);
  const [scale, setScale] = useState(1.0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [loadingSignedDoc, setLoadingSignedDoc] = useState(false);

  const loadSignedDocument = useCallback(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      try {
        const url = await fetchDocumentUrl({ apiKey, documentId });
        setSignedDocumentUrl(url);
        setLoadingSignedDoc(false);
        return;
      } catch {
        // retry
      }
    }
    setLoadingSignedDoc(false);
  }, [apiKey, documentId]);

  const generateMutation = useMutation({
    mutationFn: (action: ActionType) =>
      generateVerificationCode({ documentId, signerId: userId, type: toCodeType(action) }),
    onSuccess: () => {
      setShowModal(true);
      setCode('');
    },
  });

  const validateMutation = useMutation({
    mutationFn: (vars: { code: string; action: ActionType }) =>
      validateCode({ documentId, signerId: userId, code: vars.code, type: toCodeType(vars.action) }),
    onSuccess: (_, vars) => {
      setShowModal(false);
      setCode('');
      setCompletedAction(vars.action);
      if (vars.action === 'sign') {
        setLoadingSignedDoc(true);
        loadSignedDocument();
      }
    },
  });

  const isBusy = generateMutation.isPending || validateMutation.isPending;
  const isExpiredCode = validateMutation.error?.message === 'Código expirado';

  const handleAction = (action: ActionType) => {
    setActionType(action);
    validateMutation.reset();
    generateMutation.mutate(action);
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

  if (completedAction === 'reject') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Documento rechazado</h2>
          <p className="text-gray-500">El documento ha sido rechazado exitosamente.</p>
        </div>
      </div>
    );
  }

  if (completedAction === 'sign') {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Success banner */}
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">Documento firmado exitosamente</p>
            <p className="text-sm text-green-600">La firma ha sido estampada en el documento.</p>
          </div>
        </div>

        {/* Navbar with zoom only */}
        <nav className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Documento Firmado</h1>
              {ZoomControls}
            </div>
          </div>
        </nav>

        {loadingSignedDoc ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-gray-500">Cargando documento firmado...</p>
            </div>
          </div>
        ) : signedDocumentUrl ? (
          <PdfViewer
            url={signedDocumentUrl}
            scale={scale}
            onLoadSuccess={handleLoadSuccess}
            onPageChange={handlePageChange}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-500">El documento firmado está siendo procesado.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Visor de Documentos</h1>

            {ZoomControls}

            {/* Action buttons */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {generateMutation.isError && (
                <p className="text-sm text-red-600">{generateMutation.error?.message}</p>
              )}
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
            </div>
          </div>
        </div>
      </nav>

      {/* PDF Viewer */}
      <PdfViewer
        url={documentUrl}
        scale={scale}
        onLoadSuccess={handleLoadSuccess}
        onPageChange={handlePageChange}
      />

      {/* OTP Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {actionType === 'sign' ? 'Verificar firma' : 'Verificar rechazo'}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest text-gray-900"
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
