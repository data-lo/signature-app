'use client';

import { FormFileUpload } from '@/components/form/form-file-upload';
import {
  DOCUMENT_FILE_ACCEPTED_TYPES,
  DOCUMENT_FILE_LABELS,
  DOCUMENT_FILE_MAX_SIZE,
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
      maxFileSize={DOCUMENT_FILE_MAX_SIZE}
      labelMaxFileSizeExceeded={DOCUMENT_FILE_LABELS.maxSizeExceeded}
      labelIdle={DOCUMENT_FILE_LABELS.idle}
      disabled={disabled}
    />
  );
}
