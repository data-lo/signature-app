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
  /**
   * Tamaño máximo: en bytes, o en el formato de FilePond (p. ej. `'20MB'`). Ojo: FilePond convierte
   * las cadenas con base 1000; para un límite binario, pasar los bytes.
   */
  maxFileSize?: string | number;
  /** Base (1000 o 1024) con la que FilePond formatea los tamaños que muestra. */
  fileSizeBase?: number;
  labelIdle?: string;
  labelFileTypeNotAllowed?: string;
  /** Segunda línea del error de tipo (en FilePond, `fileValidateTypeLabelExpectedTypes`). */
  labelFileTypeExpected?: string;
  labelMaxFileSizeExceeded?: string;
  /** Segunda línea del error de tamaño; `{filesize}` se sustituye por el límite. */
  labelMaxFileSize?: string;
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
 *
 * Bug corregido: un archivo rechazado por la validación (tamaño o tipo) dejaba al consumidor
 * "cargando" para siempre. FilePond anuncia el ítem por `onupdatefiles` al agregarlo, todavía
 * cargando, pero cuando la validación lo rechaza NO vuelve a disparar ese evento (en su código,
 * el rechazo no pasa por `listUpdated`): la única señal es `onaddfile` con `error`. Ahí se
 * cierra la carga y se vacía el valor. FilePond sigue mostrando su propio mensaje de error en el
 * widget, y el consumidor ya no se queda con el archivo anterior ni con un estado a medias.
 *
 * @param props - Ver `FormFileUploadProps`.
 * @returns El campo con el widget de FilePond.
 *
 * @example
 * ```tsx
 * <FormFileUpload name="documentFile" value={file} onChange={setFile}
 *   acceptedFileTypes={['application/pdf']} maxFileSize={20 * 1024 * 1024} fileSizeBase={1024} />
 * ```
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
  fileSizeBase,
  labelIdle,
  labelFileTypeNotAllowed,
  labelFileTypeExpected,
  labelMaxFileSizeExceeded,
  labelMaxFileSize,
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
  // Sólo se pasan a FilePond si llegan: con `undefined` explícito FilePond pierde su valor por
  // omisión en vez de conservarlo.
  const optionalFilePondOptions = {
    ...(labelFileTypeExpected !== undefined && {
      fileValidateTypeLabelExpectedTypes: labelFileTypeExpected,
    }),
    ...(fileSizeBase !== undefined && { fileSizeBase }),
    ...(labelMaxFileSize !== undefined && { labelMaxFileSize }),
  };

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
          onaddfile={(error) => {
            if (!error) return;
            onLoadingChange?.(false);
            clearedFromWidgetRef.current = true;
            onChange(null);
          }}
          allowMultiple={false}
          acceptedFileTypes={acceptedFileTypes}
          labelFileTypeNotAllowed={labelFileTypeNotAllowed}
          // Los tipos de FilePond sólo declaran cadenas, pero su conversor lee una cadena
          // numérica ("20971520") como bytes exactos: así se pasa un límite binario sin
          // que FilePond lo reinterprete con base 1000.
          maxFileSize={
            maxFileSize === undefined ? undefined : String(maxFileSize)
          }
          labelMaxFileSizeExceeded={labelMaxFileSizeExceeded}
          {...optionalFilePondOptions}
          labelIdle={labelIdle}
          credits={false}
        />
      </div>
    </FormFieldShell>
  );
}
