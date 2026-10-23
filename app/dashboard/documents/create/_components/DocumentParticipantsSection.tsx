'use client';

import type { Control } from 'react-hook-form';
import { FormSection } from '@/components/form/form-section';
import type { SectionState } from '../_interfaces/section-state.interface';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import CollaboratorsFieldArray from './CollaboratorsFieldArray';
import IncludeMeAsSignerField from './IncludeMeAsSignerField';
import RequiresOrderField from './RequiresOrderField';

interface DocumentParticipantsSectionProps {
  state: SectionState;
  control: Control<CreateDocumentSignaturesFormValues>;
}

/**
 * Sección de participantes: quién firma, quién solo puede ver el documento —incluido el propio
 * usuario si marca "Incluirme como firmante"— y en qué orden firman. Los errores de cada campo los
 * muestra el campo; acá se muestra el error general de la sección — "agrega al menos un firmante" —
 * que no pertenece a ningún campo en particular.
 *
 * "Requiere firmas en orden" se movió aquí desde la sección de configuración: es el interruptor que
 * hace aparecer las manijas de arrastre y la numeración **dentro de esta misma lista**
 * (`CollaboratorsFieldArray`), y desde el otro acordeón el usuario activaba algo cuyo efecto no
 * podía ver. Va arriba de la lista para que la causa se lea antes que el efecto.
 *
 * El interruptor sigue siendo el mismo campo del formulario (`requiresOrder`), así que el payload
 * enviado al backend no cambia: la mudanza es de ubicación, no de contrato.
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
      <RequiresOrderField control={control} />
      <CollaboratorsFieldArray control={control} />
      <IncludeMeAsSignerField control={control} />
    </FormSection>
  );
}
