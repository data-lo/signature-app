'use client';

import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

interface DocumentDropzoneProps {
  id: string;
  label: string;
  /** Formatos y peso permitidos. Se omite cuando el contenedor ya los muestra por su cuenta. */
  hint?: string;
  accept: string;
  file: File | null;
  error?: string;
  onFileChange: (file: File | null) => void;
  /** Espeja el límite real del backend para este campo (ver src/shared/constants/file-upload.constants.ts en signature-server). */
  maxFileSizeMB: number;
}

export default function DocumentDropzone({
  id,
  label,
  hint,
  accept,
  file,
  error,
  onFileChange,
  maxFileSizeMB,
}: DocumentDropzoneProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <FilePond
        id={id}
        files={file ? [file] : []}
        onupdatefiles={(fileItems) => {
          const nextFile = fileItems[0]?.file as File | undefined;
          onFileChange(nextFile ?? null);
        }}
        allowMultiple={false}
        acceptedFileTypes={accept.split(',').map((type) => type.trim())}
        labelFileTypeNotAllowed="Formato de archivo no permitido"
        maxFileSize={`${maxFileSizeMB}MB`}
        labelMaxFileSizeExceeded={`El archivo debe pesar menos de ${maxFileSizeMB}MB`}
        labelIdle='Arrastra tu archivo aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>'
        credits={false}
      />

      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  );
}
