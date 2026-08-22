'use client';

import type { Control } from 'react-hook-form';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import RequiresApprovalField from './RequiresApprovalField';
import RequiresOrderField from './RequiresOrderField';
import SignatureTypeField from './SignatureTypeField';

interface DocumentConfigurationSectionProps {
  state: SectionState;
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * Sección de configuración del envío: qué tipo de firma se exige, si el documento necesita
 * aprobación previa y si las firmas deben recogerse en un orden. Cada campo decide si aplica a la
 * cuenta activa y con cuántos firmantes puede activarse — la sección solo los agrupa y les pasa el
 * contexto que necesitan.
 *
 * "Incluirme como firmante" no vive aquí sino en `DocumentParticipantsSection`: es una decisión
 * sobre quién firma, no sobre cómo se envía el documento.
 */
export default function DocumentConfigurationSection({
  state,
  control,
}: DocumentConfigurationSectionProps) {
  return (
    <FormSection
      isEnabled={state.isEnabled}
      isLoading={state.isLoading}
      hasError={state.hasError}
      errorMessage={state.errorMessage}
      missingRequirementMessage={state.missingRequirementMessage}
      contentClassName="flex flex-col gap-4"
    >
      <SignatureTypeField control={control} />
      <RequiresApprovalField control={control} />
      <RequiresOrderField control={control} />
    </FormSection>
  );
}
