'use client';

import { FormFileUpload } from '@/components/form/form-file-upload';
import {
  DOCUMENT_FILE_ACCEPTED_TYPES,
  DOCUMENT_FILE_LABELS,
  DOCUMENT_FILE_MAX_SIZE_BYTES,
  DOCUMENT_FILE_SIZE_BASE,
} from '../_config/document-file.config';

interface DocumentFilePickerProps {
  /** Archivo actualmente seleccionado (ver `useDocumentFileSelection`). */
  file: File | null;
  onFileSelected: (file: File | null) => void;
  /** Avisa mientras FilePond procesa el archivo, para no previsualizar uno a medio cargar. */
  onLoadingChange?: (isLoading: boolean) => void;
  disabled?: boolean;
}

/**
 * Configuración concreta del campo de carga para documentos a firmar (PDF ≤ 20 MB, con los
 * textos en español de la pantalla). Toda la mecánica de carga vive en `FormFileUpload`
 * (`components/form/`), que es genérico y reutilizable; este componente solo aplica las
 * restricciones del dominio, centralizadas en `_config/document-file.config.ts`.
 *
 * El tamaño se valida aquí, en el navegador, antes de enviar nada: un archivo por encima del
 * límite no llega a la pantalla (FilePond lo rechaza y lo explica en el propio widget).
 *
 * @param props.file - Archivo seleccionado.
 * @param props.onFileSelected - Recibe el archivo ya cargado, o `null` al quitarlo o rechazarlo.
 * @param props.onLoadingChange - Avisa mientras FilePond procesa el archivo.
 * @param props.disabled - Deshabilita el widget.
 * @returns El campo de carga configurado para documentos a firmar.
 *
 * @example
 * ```tsx
 * <DocumentFilePicker file={file} onFileSelected={select} onLoadingChange={setLoading} />
 * ```
 */
export default function DocumentFilePicker({
  file,
  onFileSelected,
  onLoadingChange,
  disabled,
}: DocumentFilePickerProps) {
  return (
    <FormFileUpload
      name="documentFile"
      value={file}
      onChange={onFileSelected}
      onLoadingChange={onLoadingChange}
      acceptedFileTypes={DOCUMENT_FILE_ACCEPTED_TYPES}
      labelFileTypeNotAllowed={DOCUMENT_FILE_LABELS.typeNotAllowed}
      labelFileTypeExpected={DOCUMENT_FILE_LABELS.expectedTypes}
      maxFileSize={DOCUMENT_FILE_MAX_SIZE_BYTES}
      fileSizeBase={DOCUMENT_FILE_SIZE_BASE}
      labelMaxFileSizeExceeded={DOCUMENT_FILE_LABELS.maxSizeExceeded}
      labelMaxFileSize={DOCUMENT_FILE_LABELS.maxSize}
      labelIdle={DOCUMENT_FILE_LABELS.idle}
      disabled={disabled}
    />
  );
}
