'use client';

import type { ReactNode } from 'react';
import {
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface DocumentSectionAccordionItemProps {
  /** Identifica al acordeón dentro del grupo (ver `CreateDocumentView`, que controla cuáles están abiertos). */
  value: string;
  /** Número de paso que se muestra en el encabezado. */
  step: number;
  title: string;
  /** Ilumina el indicador del paso cuando la sección ya está configurada. */
  isComplete: boolean;
  /** Resumen del contenido, visible solo mientras la sección está contraída. */
  collapsedSummary: string;
  isOpen: boolean;
  children: ReactNode;
}

/**
 * Una de las tres secciones de la solicitud de firma como acordeón: encabezado siempre
 * interactivo (ninguna sección se bloquea por el estado de otra) con su número de paso, la
 * indicador de paso iluminado cuando ya está configurada y —solo cuando está contraída— el
 * resumen de lo que contiene.
 *
 * El resumen se renderiza condicionalmente en vez de ocultarse con CSS: así lo que se ve en
 * pantalla y lo que existe en el DOM dicen lo mismo, tanto para lectores de pantalla como para
 * las pruebas.
 */
export default function DocumentSectionAccordionItem({
  value,
  step,
  title,
  isComplete,
  collapsedSummary,
  isOpen,
  children,
}: DocumentSectionAccordionItemProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              data-complete={isComplete || undefined}
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground transition-colors data-[complete=true]:bg-emerald-100 data-[complete=true]:text-emerald-900 dark:data-[complete=true]:bg-emerald-950 dark:data-[complete=true]:text-emerald-200"
            >
              {step}
            </span>
            <span className="text-sm font-medium text-foreground">{title}</span>
          </span>
          {!isOpen && (
            <span className="truncate pl-7 text-xs text-muted-foreground">
              {collapsedSummary}
            </span>
          )}
        </span>
      </AccordionTrigger>

      <AccordionPanel>{children}</AccordionPanel>
    </AccordionItem>
  );
}
