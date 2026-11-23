'use client';

import { FormFileUpload } from '@/components/form/form-file-upload';

import {
  ACCEPTED_VERIFICATION_MIME_TYPES,
  MAX_VERIFICATION_FILE_SIZE,
} from '../_schemas';

const LABELS = {
  idle: '<strong>Arrastra tu archivo aquí</strong><br/>o <span class="filepond--label-action">selecciónalo desde tu dispositivo</span>',
  typeNotAllowed: 'Formato no permitido',
  expectedTypes: 'Selecciona un XML de auditoría o un PDF',
  maxSizeExceeded: 'El archivo es demasiado grande',
  maxSize: 'El máximo es {filesize}',
};

const DROPZONE_CLASSES = [
  '[&_.filepond--root]:mb-0',
  '[&_.filepond--panel-root]:rounded-xl',
  '[&_.filepond--panel-root]:border-2',
  '[&_.filepond--panel-root]:border-dashed',
  '[&_.filepond--panel-root]:border-primary/30',
  '[&_.filepond--panel-root]:bg-primary/5',
  '[&_.filepond--drop-label]:text-foreground',
  '[&_.filepond--label-action]:text-primary',
].join(' ');

interface VerificationFileUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  /** Mensaje de validación del archivo elegido (ver `validateVerificationFile`). */
  errorMessage?: string;
  disabled?: boolean;
}

/**
 * Zona de carga de la consulta pública: un único XML de auditoría o PDF final.
 *
 * Sólo configura `FormFileUpload` con los tipos, el tope y los textos de esta pantalla; la regla
 * que habilita el botón vive en `verificationFileSchema`, no en FilePond.
 *
 * @param props - Archivo actual, su callback, el aviso de carga local y el error de validación.
 * @returns El campo de carga.
 *
 * @example
 * ```tsx
 * <VerificationFileUpload file={file} onFileChange={setFile} errorMessage={error ?? undefined} />
 * ```
 */
export function VerificationFileUpload({
  file,
  onFileChange,
  onLoadingChange,
  errorMessage,
  disabled,
}: VerificationFileUploadProps) {
  return (
    <FormFileUpload
      name="verificationFile"
      // La tarjeta ya lo titula "Archivo a verificar": la etiqueta queda sólo para lectores de
      // pantalla, para no repetir el texto en la pantalla.
      label={<span className="sr-only">Archivo a verificar</span>}
      // Zona de carga del diseño: borde punteado y fondo tenue sobre el panel de FilePond.
      className={DROPZONE_CLASSES}
      value={file}
      onChange={onFileChange}
      onLoadingChange={onLoadingChange}
      errorMessage={errorMessage}
      acceptedFileTypes={ACCEPTED_VERIFICATION_MIME_TYPES}
      maxFileSize={MAX_VERIFICATION_FILE_SIZE}
      fileSizeBase={1024}
      labelIdle={LABELS.idle}
      labelFileTypeNotAllowed={LABELS.typeNotAllowed}
      labelFileTypeExpected={LABELS.expectedTypes}
      labelMaxFileSizeExceeded={LABELS.maxSizeExceeded}
      labelMaxFileSize={LABELS.maxSize}
      disabled={disabled}
    />
  );
}
