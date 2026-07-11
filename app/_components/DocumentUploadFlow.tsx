'use client';

import { useState } from 'react';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentPrepareModal from './DocumentPrepareModal';

interface DocumentUploadFlowProps {
  onContinueToPreparation: (data: {
    name: string;
    file: File;
    willSign: boolean;
  }) => void;
}

export default function DocumentUploadFlow({
  onContinueToPreparation,
}: DocumentUploadFlowProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <DocumentUploadZone
        onFileSelected={(file) => {
          setSelectedFile(file);
          setIsModalOpen(true);
        }}
      />
      <DocumentPrepareModal
        file={selectedFile}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onContinue={onContinueToPreparation}
      />
    </>
  );
}
