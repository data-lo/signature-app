'use client';

import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import 'filepond/dist/filepond.min.css';
import { useDocumentUploadProcessor } from '../_hooks/useDocumentUploadProcessor';

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

interface DocumentUploadCardProps {
  signerId: string | null;
  onUploadSuccess: (documentId: string) => void;
  onUploadReset: () => void;
}

export default function DocumentUploadCard({
  signerId,
  onUploadSuccess,
  onUploadReset,
}: DocumentUploadCardProps) {
  const { process, revert } = useDocumentUploadProcessor({ signerId, onUploadSuccess, onUploadReset });

  return (
    <FilePond
      allowMultiple={false}
      disabled={!signerId}
      acceptedFileTypes={['application/pdf']}
      labelFileTypeNotAllowed="El documento debe estar en formato PDF"
      maxFileSize="20MB"
      labelMaxFileSizeExceeded="El documento debe pesar menos de 20MB"
      labelIdle={
        signerId
          ? 'Arrastra tu documento aquí o <span class="filepond--label-action">da clic para seleccionar uno</span>'
          : 'Selecciona un firmante para habilitar la carga'
      }
      server={{ process, revert }}
      credits={false}
    />
  );
}
