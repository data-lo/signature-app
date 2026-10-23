'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Acordeón del sistema de diseño, sobre el primitivo de `@base-ui/react` (la misma librería que
 * el resto de `components/ui/*`, no Radix).
 *
 * `multiple` viene en `true` (el primitivo trae `false`): varios paneles pueden estar abiertos a
 * la vez y abrir uno no cierra los demás. Es la única forma de que un formulario repartido en
 * secciones se pueda ver completo y editar en cualquier orden — con el comportamiento por
 * defecto, cada clic cerraba todo lo que el usuario ya tenía abierto.
 *
 * No conoce ningún formulario concreto: el encabezado se compone desde afuera (número de paso,
 * título, indicador de completado, resumen del contenido contraído) para que cada pantalla decida
 * qué mostrar sin que este componente tenga que saberlo.
 */
function Accordion({
  className,
  multiple = true,
  ...props
}: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={multiple}
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none',
          'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
          className,
        )}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/accordion-trigger:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/**
 * `keepMounted` por defecto: el contenido de un panel contraído sigue montado (oculto con el
 * atributo `hidden`, así que no es enfocable ni visible). Es lo que permite que un formulario
 * repartido en varias secciones no pierda estado —ni desmonte campos con su propio ciclo de vida,
 * como los `useFieldArray`— cada vez que el usuario contrae una sección.
 */
function AccordionPanel({
  className,
  children,
  keepMounted = true,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      keepMounted={keepMounted}
      className={cn('border-t border-border', className)}
      {...props}
    >
      <div className="px-4 py-4">{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel };
