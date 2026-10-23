'use client';

import { useState } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import { FileStatus, type FilePondFile } from 'filepond';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';

registerPlugin(FilePondPluginFileValidateSize);

/** .key/.cer no tienen un MIME type confiable entre navegadores/SO — se valida por extensión
 * real del archivo (`item.fileExtension`), no por `acceptedFileTypes` (que compara MIME). */
const MAX_FILE_SIZE_LABEL = '256KB';

interface EfirmaFilePickerProps {
  /** Sin el punto, ej. 'key' o 'cer'. */
  extension: string;
  /** Ej. 'llave privada' o 'certificado', usado en los mensajes al usuario. */
  fileLabel: string;
  onFileSelected: (file: File | null) => void;
}

/** Extraída para poder probarla sin simular drag&drop de FilePond en jsdom. */
export function matchesExtension(
  fileExtension: string,
  expectedExtension: string,
): boolean {
  return fileExtension.toLowerCase() === expectedExtension.toLowerCase();
}

export default function EfirmaFilePicker({
  extension,
  fileLabel,
  onFileSelected,
}: EfirmaFilePickerProps) {
  const [extensionError, setExtensionError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <FilePond
        allowMultiple={false}
        maxFiles={1}
        credits={false}
        maxFileSize={MAX_FILE_SIZE_LABEL}
        labelMaxFileSizeExceeded={`El archivo debe pesar menos de ${MAX_FILE_SIZE_LABEL}`}
        labelIdle={`Arrastra tu ${fileLabel} (.${extension}) aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>`}
        beforeAddFile={(item: FilePondFile) => {
          const isValidExtension = matchesExtension(
            item.fileExtension,
            extension,
          );
          setExtensionError(
            isValidExtension
              ? null
              : `El archivo debe tener extensión .${extension}`,
          );
          return isValidExtension;
        }}
        onupdatefiles={(fileItems) => {
          const item = fileItems[0];
          if (!item) {
            onFileSelected(null);
            return;
          }
          if (item.status !== FileStatus.IDLE) return;
          onFileSelected(item.file as File);
        }}
        onremovefile={() => {
          // Bug corregido: FilePond dispara este evento también cuando `beforeAddFile` acaba de
          // rechazar un archivo (lo agrega y lo remueve internamente) — limpiar `extensionError`
          // aquí borraba el mensaje justo después de mostrarlo. Solo se limpia `onFileSelected`;
          // el error se resetea naturalmente cuando `beforeAddFile` acepta un archivo válido.
          onFileSelected(null);
        }}
      />
      {extensionError && (
        <p className="text-sm text-destructive">{extensionError}</p>
      )}
    </div>
  );
}
