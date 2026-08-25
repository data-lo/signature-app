'use client';

import type { Control } from 'react-hook-form';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import RequiresApprovalField from './RequiresApprovalField';
import SignatureTypeField from './SignatureTypeField';

interface DocumentConfigurationSectionProps {
  state: SectionState;
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * Sección de configuración del envío: qué tipo de firma se exige y si el documento necesita
 * aprobación previa. Cada campo decide si aplica a la cuenta activa — la sección solo los agrupa y
 * les pasa el contexto que necesitan.
 *
 * Dos decisiones que **no** viven aquí, ambas por el mismo criterio (son sobre *quién* firma, no
 * sobre *cómo* se envía el documento) y ambas en `DocumentParticipantsSection`: "Incluirme como
 * firmante" y "Requiere firmas en orden".
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
    </FormSection>
  );
}
