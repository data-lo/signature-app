'use client';

import { FilePond, registerPlugin } from 'react-filepond';
import { FileStatus } from 'filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

interface DocumentFilePickerProps {
  onFileSelected: (file: File | null) => void;
  /**
   * Bug corregido: mientras FilePond procesa el archivo localmente (status LOADING/INIT), cada
   * disparo de `onupdatefiles` traía una referencia de `File` distinta para el mismo archivo —
   * <PdfPreview> (react-pdf) recargaba el documento en cada una, causando el parpadeo reportado
   * (a veces escalando a "Maximum update depth exceeded"). Ahora solo se propaga el archivo una
   * vez que FilePond lo deja en IDLE (completamente cargado); mientras tanto se avisa "cargando"
   * para que el padre pueda mostrar un indicador en vez de la previsualización inestable.
   */
  onLoadingChange?: (isLoading: boolean) => void;
}

export default function DocumentFilePicker({
  onFileSelected,
  onLoadingChange,
}: DocumentFilePickerProps) {
  return (
    <FilePond
      onupdatefiles={(fileItems) => {
        const item = fileItems[0];

        if (!item) {
          onLoadingChange?.(false);
          onFileSelected(null);
          return;
        }

        const isSettled = item.status === FileStatus.IDLE;
        onLoadingChange?.(!isSettled);

        if (isSettled) {
          onFileSelected(item.file as File);
        }
      }}
      allowMultiple={false}
      acceptedFileTypes={['application/pdf']}
      labelFileTypeNotAllowed="El documento debe estar en formato PDF"
      maxFileSize="20MB"
      labelMaxFileSizeExceeded="El documento debe pesar menos de 20MB"
      labelIdle='Arrastra tu documento aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>'
      credits={false}
    />
  );
}
