'use client';

import dynamic from 'next/dynamic';
import type {
  Control,
  UseFormGetValues,
  UseFormSetValue,
} from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import type { SectionState } from '../_interfaces/section-state.interface';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

// react-pdf necesita el DOM (canvas) — igual que PdfPreview, se carga solo en cliente.
const SignaturePlacementField = dynamic(
  () => import('./SignaturePlacementField'),
  { ssr: false },
);

interface DocumentSignaturePlacementSectionProps {
  state: SectionState;
  file: File | null;
  control: Control<CreateDocumentSignaturesFormValues>;
  getValues: UseFormGetValues<CreateDocumentSignaturesFormValues>;
  setValue: UseFormSetValue<CreateDocumentSignaturesFormValues>;
  /** Páginas del PDF ya renderizado, para el encabezado del acordeón y el resumen de la solicitud. */
  onPageCountChange?: (pageCount: number) => void;
}

/**
 * Sección de ubicación de firmas: la única con un requisito previo duro — las firmas se colocan
 * arrastrándolas sobre el PDF renderizado, así que sin un archivo completamente cargado no hay
 * nada sobre lo que trabajar (ver `_section-rules.ts`).
 *
 * A diferencia del resto, no usa `FormSection`: sus estados (cargando, requisito faltante,
 * error) tienen que dibujarse *dentro* de la tarjeta de altura fija que sostiene la columna
 * derecha de la retícula — si se mostraran encima, la columna cambiaría de alto según el estado.
 */
export default function DocumentSignaturePlacementSection({
  state,
  file,
  control,
  getValues,
  setValue,
  onPageCountChange,
}: DocumentSignaturePlacementSectionProps) {
  return (
    <section
      data-slot="form-section"
      aria-busy={state.isLoading || undefined}
      aria-disabled={!state.isEnabled || undefined}
      className="lg:sticky lg:top-4"
    >
      {/* Sin la tarjeta exterior que antes envolvía toda la pantalla, la vista previa puede
          ocupar el alto disponible en pantallas grandes en vez de una altura fija. */}
      <Card className="h-[640px] overflow-hidden p-0 lg:h-[calc(100dvh-8rem)] lg:min-h-[640px]">
        <CardContent className="h-full p-0">
          {state.isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando documento...
            </div>
          ) : state.hasError && state.errorMessage ? (
            <div className="flex h-full items-center justify-center p-6">
              <FieldError>{state.errorMessage}</FieldError>
            </div>
          ) : state.isEnabled && file ? (
            <SignaturePlacementField
              file={file}
              control={control}
              getValues={getValues}
              setValue={setValue}
              onPageCountChange={onPageCountChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {state.missingRequirementMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
