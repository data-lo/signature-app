'use client';

import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import { DOCUMENT_FILE_HELP_TEXT } from '../_config/document-file.config';
import DocumentFilePicker from './DocumentFilePicker';

interface DocumentUploadSectionProps {
  state: SectionState;
  file: File | null;
  onFileSelected: (file: File | null) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

/**
 * Sección de carga del PDF: el punto de entrada del flujo. No tiene requisitos previos, así que
 * su único estado propio es el de "procesando archivo" mientras FilePond lo valida y lo lee
 * (ver `_section-rules.ts`).
 */
export default function DocumentUploadSection({
  state,
  file,
  onFileSelected,
  onLoadingChange,
}: DocumentUploadSectionProps) {
  return (
    <FormSection
      description={DOCUMENT_FILE_HELP_TEXT}
      isEnabled={state.isEnabled}
      isLoading={state.isLoading}
      hasError={state.hasError}
      errorMessage={state.errorMessage}
      missingRequirementMessage={state.missingRequirementMessage}
    >
      <DocumentFilePicker
        file={file}
        onFileSelected={onFileSelected}
        onLoadingChange={onLoadingChange}
        disabled={!state.isEnabled}
      />
    </FormSection>
  );
}
