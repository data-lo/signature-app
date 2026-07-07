'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  generateVerificationCode,
  validateCode,
  fetchDocumentUrl,
  submitForCancellation,
} from '../_actions';

export type DocumentAction = 'sign' | 'reject' | 'cancel';

const POLL_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 2000;

function toCodeType(action: DocumentAction): 'VERIFICATION' | 'REJECTION' | 'CANCELLATION' {
  if (action === 'sign') return 'VERIFICATION';
  if (action === 'reject') return 'REJECTION';
  return 'CANCELLATION';
}

interface UseDocumentLifecycleParams {
  apiKey: string;
  documentId: string;
  signerId: string;
}

// Orquesta la lógica de negocio del visor: generación/validación de códigos de
// verificación, cancelación y el polling del documento procesado tras una acción.
// El polling se cancela si el componente se desmonta para evitar setState sobre
// un componente ya desmontado (fuga de memoria/warning de React).
export function useDocumentLifecycle({ apiKey, documentId, signerId }: UseDocumentLifecycleParams) {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<DocumentAction>('sign');
  const [code, setCode] = useState('');
  const [completedAction, setCompletedAction] = useState<DocumentAction | null>(null);
  const [processedDocumentUrl, setProcessedDocumentUrl] = useState<string | null>(null);
  const [loadingProcessedDoc, setLoadingProcessedDoc] = useState(false);

  const cancelledRef = useRef(false);
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const loadProcessedDocument = useCallback(async () => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (cancelledRef.current) return;
      try {
        const url = await fetchDocumentUrl({ apiKey, documentId });
        if (cancelledRef.current) return;
        setProcessedDocumentUrl(url);
        setLoadingProcessedDoc(false);
        return;
      } catch {
        // reintenta hasta agotar los intentos
      }
    }
    if (!cancelledRef.current) setLoadingProcessedDoc(false);
  }, [apiKey, documentId]);

  const generateMutation = useMutation({
    mutationFn: (action: DocumentAction) =>
      generateVerificationCode({ documentId, signerId, type: toCodeType(action) }),
    onSuccess: () => {
      setShowModal(true);
      setCode('');
    },
  });

  const validateMutation = useMutation({
    mutationFn: (vars: { code: string; action: DocumentAction }) =>
      validateCode({ documentId, signerId, code: vars.code, type: toCodeType(vars.action) }),
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

  const handleAction = useCallback(
    (action: DocumentAction) => {
      setActionType(action);
      validateMutation.reset();
      generateMutation.reset();
      if (action === 'cancel') {
        submitCancelMutation.reset();
        submitCancelMutation.mutate();
      } else {
        generateMutation.mutate(action);
      }
    },
    [generateMutation, submitCancelMutation, validateMutation],
  );

  const handleValidate = useCallback(() => {
    if (!code.trim()) return;
    validateMutation.mutate({ code: code.trim(), action: actionType });
  }, [actionType, code, validateMutation]);

  const handleRequestNewCode = useCallback(() => {
    validateMutation.reset();
    setCode('');
    generateMutation.mutate(actionType);
  }, [actionType, generateMutation, validateMutation]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setCode('');
    validateMutation.reset();
  }, [validateMutation]);

  return {
    showModal,
    actionType,
    code,
    setCode,
    completedAction,
    processedDocumentUrl,
    loadingProcessedDoc,
    generateMutation,
    validateMutation,
    submitCancelMutation,
    isBusy,
    isExpiredCode,
    handleAction,
    handleValidate,
    handleRequestNewCode,
    handleCloseModal,
  };
}
