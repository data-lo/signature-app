'use client';

import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

interface DocumentFilePickerProps {
  onFileSelected: (file: File | null) => void;
}

export default function DocumentFilePicker({ onFileSelected }: DocumentFilePickerProps) {
  return (
    <FilePond
      onupdatefiles={(fileItems) => {
        const file = fileItems[0]?.file as File | undefined;
        onFileSelected(file ?? null);
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
