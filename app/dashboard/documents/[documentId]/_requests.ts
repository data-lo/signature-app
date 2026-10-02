import apiClient from '@/lib/axios';
import {
  DocumentStatus,
  ParticipantRole,
  ParticipantStatus,
  SignatureType,
  BiometricSignatureStatus,
} from '@/lib/enums/document';

export interface DocumentParticipant {
  id: string;
  /** null cuando el colaborador fue invitado solo por email (sin cuenta de plataforma). */
  userId: string | null;
  email: string;
  name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  cancellationReason: string | null;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  fileType: string;
  totalPages: number;
  status: DocumentStatus;
  creator: string;
  secureUrl: string;
  expiresIn: number;
  participants: DocumentParticipant[];
  myRole: ParticipantRole | null;
  myStatus: ParticipantStatus | null;
  mySignatureType: SignatureType | null;
  canSign: boolean;
  canReject: boolean;
  canRequestCancellation: boolean;
  canConfirmCancellation: boolean;
  requiresVerification: boolean;
  verificationConfirmed: boolean;
}

export async function getDocumentDetailRequest(
  documentId: string,
): Promise<DocumentDetail> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: DocumentDetail;
  }>(`/api/v1/document/${documentId}`);

  return data.data;
}

export interface AdvancedSignatureFiles {
  password: string;
  keyFile: File;
  cerFile: File;
}

export interface SignDocumentGeolocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * La geolocalización es obligatoria para firmar (la exige el backend con un 400), y lo es para
 * ambos tipos de firma — antes la firma FIEL no la mandaba en absoluto, porque el payload era
 * una unión excluyente entre "archivos de e.firma" y "ubicación". Ahora la ubicación va siempre
 * y los archivos solo cuando la firma es avanzada.
 */
export interface SignDocumentPayload {
  geolocation: SignDocumentGeolocation;
  advancedSignature?: AdvancedSignatureFiles;
}

/**
 * Siempre manda multipart/form-data: el backend usa `FileFieldsInterceptor` en este endpoint
 * para poder recibir `.key`/`.cer` cuando la firma es electrónica avanzada (FIEL) — mandar el
 * PATCH sin body/Content-Type rompía a multer ("Boundary not found").
 */
export interface SignDocumentResponseData {
  id: string;
  /**
   * `true` si esta firma era la última que faltaba y el documento quedó completo; `false` si
   * todavía quedan participantes pendientes.
   *
   * Lo decide el backend, que es quien sabe cuántos firmantes faltaban: deducirlo acá desde el
   * detalle cargado en la pantalla sería leer el estado ANTERIOR a esta firma. La confirmación
   * que se le muestra al firmante depende de este dato, así que equivocarlo significa prometerle
   * un documento en "Completados" que todavía no está ahí.
   */
  documentCompleted: boolean;
}

export async function signDocumentRequest(
  documentId: string,
  payload: SignDocumentPayload,
): Promise<SignDocumentResponseData> {
  const formData = new FormData();
  formData.append('geolocation', JSON.stringify(payload.geolocation));

  if (payload.advancedSignature) {
    formData.append('password', payload.advancedSignature.password);
    formData.append('key', payload.advancedSignature.keyFile);
    formData.append('cer', payload.advancedSignature.cerFile);
  }
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: SignDocumentResponseData;
  }>(`/api/v1/document/${documentId}/sign`, formData);

  return data.data;
}

/**
 * Emisión del código de verificación de firma. `emailDelivered` distingue "el código quedó
 * emitido y salió el correo" de "quedó emitido pero el correo no salió": el backend ya no
 * responde 500 cuando falla el proveedor de correo (dejaba al firmante sin poder firmar ni
 * rechazar, ver signature-server), así que la pantalla necesita ese dato para avisarlo.
 */
export interface RequestVerificationCodeResponseData {
  emailDelivered: boolean;
}

export async function requestVerificationCodeRequest(
  documentId: string,
): Promise<RequestVerificationCodeResponseData> {
  const { data } = await apiClient.post<{
    success: boolean;
    message: string;
    data: RequestVerificationCodeResponseData | null;
  }>(`/api/v1/document/${documentId}/verification-codes`);

  // Un backend anterior a este contrato responde `data: null`; si llegó hasta acá con 2xx, el
  // correo salió (antes un fallo de envío era un 500), así que se asume entregado.
  return { emailDelivered: data.data?.emailDelivered ?? true };
}

export async function verifyCodeRequest(
  documentId: string,
  code: string,
): Promise<void> {
  await apiClient.post(`/api/v1/document/${documentId}/verification-codes/verify`, {
    code,
  });
}

export async function linkCollaboratorRequest(
  documentId: string,
): Promise<{ linked: boolean }> {
  const { data } = await apiClient.patch<{
    success: boolean;
    message: string;
    data: { linked: boolean };
  }>(`/api/v1/document/${documentId}/link-collaborator`);

  return data.data;
}

export async function rejectDocumentRequest(
  documentId: string,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/reject`, { reason });
}

/**
 * El reviewer autoriza que el documento salga a firma (historia "Implementar flujo de aprobación
 * previo al proceso de firma"). El backend comprueba que quien llama sea el aprobador asignado y
 * que el documento siga en PENDING_APPROVAL — la UI oculta el botón, pero la decisión es suya.
 *
 * @param documentId - Documento a aprobar.
 * @returns Nada: el detalle se vuelve a consultar tras la mutación.
 *
 * @throws {AxiosError} 403 si no es el aprobador asignado, 400 si el documento ya salió de
 * PENDING_APPROVAL o la decisión ya estaba registrada.
 *
 * @example
 * ```ts
 * await approveDocumentRequest('doc-1');
 * ```
 */
export async function approveDocumentRequest(
  documentId: string,
): Promise<void> {
  await apiClient.post(`/api/v1/document/${documentId}/approval/approve`);
}

/**
 * El reviewer niega la autorización. El documento queda rechazado y el flujo de firma no empieza.
 *
 * @param documentId - Documento sobre el que se decide.
 * @param resolutionNote - Motivo opcional; es lo que el creador va a leer en su correo.
 * @returns Nada.
 *
 * @throws {AxiosError} Los mismos casos que `approveDocumentRequest`.
 *
 * @example
 * ```ts
 * await rejectDocumentApprovalRequest('doc-1', 'Falta el anexo B');
 * ```
 */
export async function rejectDocumentApprovalRequest(
  documentId: string,
  resolutionNote?: string,
): Promise<void> {
  await apiClient.post(`/api/v1/document/${documentId}/approval/reject`, {
    resolutionNote: resolutionNote?.trim() ? resolutionNote.trim() : undefined,
  });
}

export async function requestCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/submit-for-cancellation`);
}

export async function confirmCancellationRequest(
  documentId: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/document/${documentId}/confirm-cancellation`);
}

/**
 * Sesión de firma biométrica tal como la devuelve el backend, al iniciarla y al consultarla.
 *
 * `url` es la página de Didit: se abre o se convierte en QR, y sólo viene mientras la sesión sigue
 * abierta y vigente. El veredicto nunca viaja aquí — llega al backend por webhook.
 */
export interface BiometricSignatureSession {
  attemptId: string;
  status: BiometricSignatureStatus;
  url: string | null;
  expiresAt: string | null;
  /** `true` si el backend devolvió una sesión que ya existía en vez de abrir otra. */
  reused: boolean;
  /** `true` cuando la firma del usuario ya quedó registrada. */
  signatureCompleted: boolean;
  /** `true` si con esa firma el documento quedó firmado por todos. */
  documentCompleted: boolean;
}

/**
 * Inicia —o retoma, si ya hay una abierta— la firma biométrica del usuario con Didit.
 *
 * La ubicación se manda aquí porque la firma se registra después, desde el webhook de Didit,
 * cuando ya no hay navegador al que pedírsela.
 *
 * @param documentId - Documento a firmar.
 * @param geolocation - Ubicación del dispositivo, obligatoria como evidencia de la firma.
 * @returns La sesión con la URL de Didit.
 *
 * @throws {AxiosError} 400 si el documento no admite la firma, 403 si no es su turno, 502 si
 *   Didit no pudo crear la sesión.
 *
 * @example
 * ```ts
 * const session = await startBiometricSignatureRequest('doc-1', { latitude: 19.4, longitude: -99.1 });
 * ```
 */
export async function startBiometricSignatureRequest(
  documentId: string,
  geolocation: SignDocumentGeolocation,
): Promise<BiometricSignatureSession> {
  const { data } = await apiClient.post<BiometricSignatureSession>(
    `/api/v1/document/${documentId}/biometric-signature`,
    { geolocation },
  );

  return data;
}

/**
 * Estado del último intento de firma biométrica del usuario sobre el documento.
 *
 * @param documentId - Documento consultado.
 * @returns La sesión del último intento, o `null` si nunca inició una.
 *
 * @throws {AxiosError} 403 si el usuario no es firmante del documento.
 *
 * @example
 * ```ts
 * const session = await getBiometricSignatureRequest('doc-1');
 * ```
 */
export async function getBiometricSignatureRequest(
  documentId: string,
): Promise<BiometricSignatureSession | null> {
  const { data } = await apiClient.get<BiometricSignatureSession | ''>(
    `/api/v1/document/${documentId}/biometric-signature`,
  );

  // Nest responde `null` como cuerpo vacío: sin intento previo llega `''`, no `null`.
  return data || null;
}
