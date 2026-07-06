import type { DocumentAction } from '../_hooks/useDocumentLifecycle';

function getModalTitle(action: DocumentAction): string {
  if (action === 'sign') return 'Verificar firma';
  if (action === 'reject') return 'Verificar rechazo';
  return 'Verificar cancelación';
}

interface VerificationModalProps {
  actionType: DocumentAction;
  code: string;
  onChangeCode: (value: string) => void;
  onValidate: () => void;
  onClose: () => void;
  onRequestNewCode: () => void;
  isBusy: boolean;
  isValidating: boolean;
  isGeneratingNewCode: boolean;
  errorMessage?: string;
  isExpiredCode: boolean;
}

export default function VerificationModal({
  actionType,
  code,
  onChangeCode,
  onValidate,
  onClose,
  onRequestNewCode,
  isBusy,
  isValidating,
  isGeneratingNewCode,
  errorMessage,
  isExpiredCode,
}: VerificationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{getModalTitle(actionType)}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Se ha enviado un código de verificación a tu correo electrónico.
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isBusy && code.trim()) onValidate();
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest text-gray-900 placeholder:text-gray-300"
            placeholder="Código de verificación"
            disabled={isBusy}
            maxLength={6}
            autoFocus
          />

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                {isExpiredCode ? 'El código ha expirado.' : errorMessage}
              </p>
              {isExpiredCode && (
                <button
                  onClick={onRequestNewCode}
                  disabled={isGeneratingNewCode}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 underline"
                >
                  {isGeneratingNewCode ? 'Enviando...' : 'Solicitar nuevo código'}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onValidate}
              disabled={isBusy || !code.trim()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isValidating ? 'Validando...' : 'Validar'}
            </button>
            <button
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
