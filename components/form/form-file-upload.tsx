'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import { FileStatus } from 'filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';
import { FormFieldShell } from './form-field';

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

export interface FormFileUploadProps {
  /** Nombre del campo; compatible con `field.name` de react-hook-form. */
  name?: string;
  /** Archivo actualmente seleccionado; compatible con `field.value`. */
  value?: File | null;
  /** Compatible con `field.onChange`: recibe el archivo ya cargado, o `null` al quitarlo. */
  onChange: (file: File | null) => void;
  /** Compatible con `field.onBlur`. */
  onBlur?: () => void;
  /**
   * Avisa mientras el archivo se está procesando localmente, para que el consumidor pueda
   * mostrar un indicador en vez de trabajar con un archivo a medio cargar.
   */
  onLoadingChange?: (isLoading: boolean) => void;
  label?: ReactNode;
  required?: boolean;
  description?: ReactNode;
  /** Mensaje de error del campo (normalmente `fieldState.error?.message`). */
  errorMessage?: string;
  acceptedFileTypes?: string[];
  /** Tamaño máximo en el formato de FilePond, p. ej. `'20MB'`. */
  maxFileSize?: string;
  labelIdle?: string;
  labelFileTypeNotAllowed?: string;
  labelMaxFileSizeExceeded?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Campo de carga de archivos del kit de formulario (FilePond + validación de tipo y tamaño),
 * compatible con react-hook-form vía `<Controller>`: acepta `name`/`value`/`onChange`/`onBlur`
 * tal como los expone `field`, y muestra etiqueta, obligatoriedad y error como el resto del kit.
 * No conoce ningún dominio: los tipos aceptados, el tamaño máximo y los textos llegan por props
 * (ver `DocumentFilePicker` para la configuración concreta de documentos a firmar).
 *
 * Sobre la carga en dos tiempos: mientras FilePond procesa el archivo, cada disparo de
 * `onupdatefiles` trae una referencia de `File` distinta para el mismo archivo — propagarlas
 * todas hacía que cualquier previsualización aguas abajo (react-pdf) recargara el documento en
 * cada una y parpadeara. Por eso solo se propaga el archivo cuando FilePond lo deja en IDLE, y
 * mientras tanto se avisa por `onLoadingChange`.
 */
export function FormFileUpload({
  name,
  value,
  onChange,
  onBlur,
  onLoadingChange,
  label,
  required,
  description,
  errorMessage,
  acceptedFileTypes,
  maxFileSize,
  labelIdle,
  labelFileTypeNotAllowed,
  labelMaxFileSizeExceeded,
  disabled,
  id,
  className,
}: FormFileUploadProps) {
  const fieldId = id ?? `field-${name ?? 'file'}`;
  // FilePond es dueño de su propia lista de archivos: no se puede "vaciar" por props. Cuando el
  // consumidor limpia el valor desde fuera (p. ej. al resetear el formulario tras un envío
  // exitoso), el widget se remonta para que su UI vuelva al estado inicial. Las limpiezas que
  // nacen del propio widget (el usuario quita el archivo) se ignoran: ahí ya está vacío.
  const [remountKey, setRemountKey] = useState(0);
  const previousValueRef = useRef<File | null>(value ?? null);
  const clearedFromWidgetRef = useRef(false);

  useEffect(() => {
    const hadFile = previousValueRef.current !== null;
    previousValueRef.current = value ?? null;

    if (hadFile && !value && !clearedFromWidgetRef.current) {
      setRemountKey((key) => key + 1);
    }
    clearedFromWidgetRef.current = false;
  }, [value]);

  return (
    <FormFieldShell
      id={fieldId}
      label={label}
      required={required}
      description={description}
      errorMessage={errorMessage}
      className={className}
    >
      {/* `onBlur` va en el contenedor (los eventos de foco burbujean en React): FilePond no
          expone un prop de blur propio. */}
      <div id={fieldId} data-slot="form-file-upload" onBlur={onBlur}>
        <FilePond
          key={remountKey}
          name={name}
          disabled={disabled}
          onupdatefiles={(fileItems) => {
            const item = fileItems[0];

            if (!item) {
              onLoadingChange?.(false);
              clearedFromWidgetRef.current = true;
              onChange(null);
              return;
            }

            const isSettled = item.status === FileStatus.IDLE;
            onLoadingChange?.(!isSettled);

            if (isSettled) {
              onChange(item.file as File);
            }
          }}
          allowMultiple={false}
          acceptedFileTypes={acceptedFileTypes}
          labelFileTypeNotAllowed={labelFileTypeNotAllowed}
          maxFileSize={maxFileSize}
          labelMaxFileSizeExceeded={labelMaxFileSizeExceeded}
          labelIdle={labelIdle}
          credits={false}
        />
      </div>
    </FormFieldShell>
  );
}
