'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  useGeolocation,
  type GeolocationCoords,
  type GeolocationErrorReason,
} from '@/lib/hooks/useGeolocation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { isSigningCredentialConfigured } from '@/lib/store/auth.slice';
import { SignatureType } from '@/lib/enums/document';
import { useDocumentDetail } from '../_hooks/useDocumentDetail';
import { useDocumentFileUrl } from '../../_hooks/useDocumentFileUrl';
import { useSignDocument } from '../_hooks/useSignDocument';
import { useRejectDocument } from '../_hooks/useRejectDocument';
import { useRequestCancellation } from '../_hooks/useRequestCancellation';
import { useConfirmCancellation } from '../_hooks/useConfirmCancellation';
import { useRequestVerificationCode } from '../_hooks/useRequestVerificationCode';
import { useVerifyCode } from '../_hooks/useVerifyCode';
import { useShareDocumentLink } from '../_hooks/useShareDocumentLink';
import {
  rejectDocumentSchema,
  type RejectDocumentFormValues,
} from '../_schemas';
import DocumentView from './DocumentView';
import type { AdvancedSignatureSubmitValues } from './AdvancedSignatureDialog';

const GEOLOCATION_ERROR_MESSAGES: Record<GeolocationErrorReason, string> = {
  unsupported: 'tu navegador no permite compartir ubicación aquí',
  'permission-denied': 'no diste permiso de ubicación',
  'position-unavailable': 'no se pudo determinar tu ubicación',
  timeout: 'se agotó el tiempo de espera para obtener tu ubicación',
};

interface DocumentViewSectionProps {
  documentId: string;
}

/**
 * Sección del detalle de un documento: aquí viven la obtención de datos, las variables, los
 * estados locales y toda la lógica de interacción (firmar, rechazar, cancelar, compartir).
 *
 * No dibuja nada por su cuenta: se lo entrega a `DocumentView`, que solo compone la pantalla con
 * los datos y callbacks que recibe.
 */
export default function DocumentViewSection({
  documentId,
}: DocumentViewSectionProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showConfirmCancellationDialog, setShowConfirmCancellationDialog] =
    useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  // `null` mientras no se ha pedido ningún código; `false` cuando el backend lo emitió pero no
  // pudo mandar el correo (ver useRequestVerificationCode) — ahí se avisa de forma persistente,
  // porque un toast se va y el usuario se quedaría esperando un correo que no va a llegar.
  const [codeEmailDelivered, setCodeEmailDelivered] = useState<boolean | null>(
    null,
  );
  const [showSignatureRequiredDialog, setShowSignatureRequiredDialog] =
    useState(false);
  // Motivo por el que la ubicación no pudo obtenerse. Se muestra de forma persistente (no solo
  // como toast) porque ahora bloquea la firma: el usuario necesita ver qué corregir para poder
  // reintentar.
  const [geoBlockedReason, setGeoBlockedReason] = useState<string | null>(null);
  // Ubicación ya obtenida para una firma FIEL, capturada antes de abrir el diálogo de e.firma.
  const [advancedSignatureCoords, setAdvancedSignatureCoords] =
    useState<GeolocationCoords | null>(null);
  const [showAdvancedSignatureDialog, setShowAdvancedSignatureDialog] =
    useState(false);

  const user = useAuthStore((state) => state.user);
  const { data: document, isLoading, isError } = useDocumentDetail(documentId);
  const {
    data: fileUrl,
    isLoading: isFileUrlLoading,
    isError: isFileUrlError,
    isFetching: isFileUrlFetching,
    refetch: refetchFileUrl,
  } = useDocumentFileUrl(documentId);
  const signMutation = useSignDocument(documentId);
  const { status: geoStatus, requestLocation } = useGeolocation();
  const rejectMutation = useRejectDocument(documentId);
  const requestCancellationMutation = useRequestCancellation(documentId);
  const confirmCancellationMutation = useConfirmCancellation(documentId);
  const requestVerificationCodeMutation =
    useRequestVerificationCode(documentId);
  const verifyCodeMutation = useVerifyCode(documentId);
  const shareLink = useShareDocumentLink(documentId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectDocumentFormValues>({
    resolver: zodResolver(rejectDocumentSchema),
  });

  function onReject(values: RejectDocumentFormValues) {
    rejectMutation.mutate(values.reason);
  }

  /**
   * La ubicación es obligatoria para firmar: si no se puede obtener (permiso rechazado, no
   * disponible, timeout o navegador sin soporte) el proceso se detiene aquí y no se manda nada
   * al backend — que de todos modos responde 400 sin ella. Antes se firmaba igual y se
   * registraba la firma sin ubicación; el requisito cambió.
   *
   * Devuelve las coordenadas o null, dejando el mensaje de error visible para que el usuario
   * sepa qué corregir y pueda reintentar.
   */
  async function resolveRequiredLocation(): Promise<GeolocationCoords | null> {
    const { coords, error } = await requestLocation();
    if (error || !coords) {
      const reason = error
        ? GEOLOCATION_ERROR_MESSAGES[error]
        : 'no se pudo determinar tu ubicación';
      setGeoBlockedReason(reason);
      toast.error(`No se puede firmar sin tu ubicación: ${reason}.`);
      return null;
    }
    setGeoBlockedReason(null);
    return coords;
  }

  async function handleSignClick() {
    // También para FIEL se pide la ubicación ANTES de abrir el diálogo de e.firma: así el
    // usuario no captura contraseña ni archivos para toparse con el bloqueo al final.
    const coords = await resolveRequiredLocation();
    if (!coords) return;

    if (document?.mySignatureType === SignatureType.Fiel) {
      setAdvancedSignatureCoords(coords);
      setShowAdvancedSignatureDialog(true);
      return;
    }

    signMutation.mutate({ geolocation: coords });
  }

  function handleAdvancedSignatureSubmit(
    values: AdvancedSignatureSubmitValues,
  ) {
    if (!advancedSignatureCoords) return;

    signMutation.mutate(
      { geolocation: advancedSignatureCoords, advancedSignature: values },
      {
        onSuccess: () => {
          setShowAdvancedSignatureDialog(false);
          setAdvancedSignatureCoords(null);
        },
      },
    );
  }

  function handleRequestVerificationCode() {
    requestVerificationCodeMutation.mutate(undefined, {
      onSuccess: (data) => {
        setCodeRequested(true);
        setCodeEmailDelivered(data?.emailDelivered ?? true);
      },
    });
  }

  /**
   * La condición es la misma que aplica el backend al firmar: `signingCredentialStatus` en
   * CONFIGURED. Antes se miraba `signatureConfigured`, derivada de tener `signatureId`, que
   * decía otra cosa — un usuario con la rúbrica subida pero con la identidad rechazada pasaba
   * este control y se topaba con el rechazo recién al enviar la firma.
   *
   * Bug corregido: mientras el store todavía no hidrata el perfil (`user` undefined), esta
   * condición daba `true` y abría el modal "Firma no configurada" —bloqueando la pantalla
   * completa— a usuarios que sí tenían su firma lista; se veía como un modal fantasma que
   * aparecía y desaparecía según lo que tardara `/api/v1/auth/me`. "Todavía no sé" se trata distinto
   * de "sé que falta": sin perfil no se afirma nada.
   */
  const needsSimpleSignatureSetup =
    document?.mySignatureType === SignatureType.Simple &&
    user != null &&
    !isSigningCredentialConfigured(user.signingCredentialStatus);

  // Alcance: solo firma simple. Bloquea también la lectura del documento (no solo
  // los botones de firma) porque el usuario puede llegar por URL directa (ej.
  // /documents/:id) sin haber pasado antes por una pantalla que ya lo avisara.
  useEffect(() => {
    if (needsSimpleSignatureSetup) {
      setShowSignatureRequiredDialog(true);
    }
  }, [needsSimpleSignatureSetup]);

  return (
    <DocumentView
      isLoading={isLoading}
      isError={isError}
      document={document ?? null}
      file={{
        url: fileUrl?.secureUrl ?? null,
        isLoading: isFileUrlLoading,
        isError: isFileUrlError,
        isRetrying: isFileUrlFetching,
        onRetry: () => void refetchFileUrl(),
      }}
      needsSimpleSignatureSetup={needsSimpleSignatureSetup}
      signing={{
        geoBlockedReason,
        isRequestingLocation: geoStatus === 'requesting',
        isSigning: signMutation.isPending,
        onSign: handleSignClick,
      }}
      verification={{
        codeRequested,
        codeEmailDelivered,
        codeInput: verificationCodeInput,
        isRequestingCode: requestVerificationCodeMutation.isPending,
        isVerifyingCode: verifyCodeMutation.isPending,
        onCodeInputChange: setVerificationCodeInput,
        onRequestCode: handleRequestVerificationCode,
        onVerifyCode: () =>
          verifyCodeMutation.mutate(verificationCodeInput, {
            onSuccess: () => setVerificationCodeInput(''),
          }),
      }}
      reject={{
        isFormOpen: showRejectForm,
        reasonField: register('reason'),
        errorMessage: errors.reason?.message,
        isRejecting: rejectMutation.isPending,
        onOpenForm: () => setShowRejectForm(true),
        onCancelForm: () => setShowRejectForm(false),
        onSubmit: handleSubmit(onReject),
      }}
      share={{
        status: shareLink.status,
        publicUrl: shareLink.publicUrl,
        onShare: () => void shareLink.share(),
        onDismissFallback: shareLink.dismissFallback,
      }}
      cancellation={{
        isRequestDialogOpen: showCancellationDialog,
        isConfirmDialogOpen: showConfirmCancellationDialog,
        isRequesting: requestCancellationMutation.isPending,
        isConfirming: confirmCancellationMutation.isPending,
        onOpenRequestDialog: setShowCancellationDialog,
        onOpenConfirmDialog: setShowConfirmCancellationDialog,
        onRequest: () =>
          requestCancellationMutation.mutate(undefined, {
            onSuccess: () => setShowCancellationDialog(false),
          }),
        onConfirm: () =>
          confirmCancellationMutation.mutate(undefined, {
            onSuccess: () => setShowConfirmCancellationDialog(false),
          }),
      }}
      signatureRequiredDialog={{
        open: showSignatureRequiredDialog,
        onOpenChange: setShowSignatureRequiredDialog,
      }}
      advancedSignatureDialog={{
        open: showAdvancedSignatureDialog,
        onOpenChange: setShowAdvancedSignatureDialog,
        onSubmit: handleAdvancedSignatureSubmit,
        isConfirming: signMutation.isPending,
      }}
    />
  );
}
