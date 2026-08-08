'use client';

import type { Control } from 'react-hook-form';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import IncludeMeAsSignerField from './IncludeMeAsSignerField';

interface DocumentParticipantsSectionProps {
  state: SectionState;
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * Sección de participantes: quién firma y quién solo puede ver el documento, incluido el propio
 * usuario si marca "Incluirme como firmante". Los errores de cada campo los muestra el campo;
 * acá se muestra el error general de la sección — "agrega al menos un firmante" — que no
 * pertenece a ningún campo en particular.
 */
export default function DocumentParticipantsSection({
  state,
  control,
}: DocumentParticipantsSectionProps) {
  return (
    <FormSection
      isEnabled={state.isEnabled}
      isLoading={state.isLoading}
      hasError={state.hasError}
      errorMessage={state.errorMessage}
      missingRequirementMessage={state.missingRequirementMessage}
      contentClassName="flex flex-col gap-4"
    >
      <CollaboratorsFieldArray control={control} />
      <IncludeMeAsSignerField control={control} />
    </FormSection>
  );
}
