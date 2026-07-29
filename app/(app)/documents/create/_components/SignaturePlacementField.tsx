'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import SignerChipsBar, { type SignerChipData } from './SignerChipsBar';
import SignaturePlacementPdfPreview from './SignaturePlacementPdfPreview';
import type { PlacedBoxView } from './SignaturePageDropZone';
import {
  resolveSignatureDrop,
  type SignatureDragPayload,
} from './resolveSignatureDrop';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';

interface SignaturePlacementFieldProps {
  file: File;
  control: Control<CreateDocumentSignaturesFormValues>;
  getValues: UseFormGetValues<CreateDocumentSignaturesFormValues>;
  setValue: UseFormSetValue<CreateDocumentSignaturesFormValues>;
}

const REJECT_FLASH_MS = 350;

const CHIP_COLORS = [
  'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200',
  'border-pink-300 bg-pink-50 text-pink-900 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-200',
];

function colorFor(collaboratorIndex: number): string {
  return CHIP_COLORS[collaboratorIndex % CHIP_COLORS.length];
}

/**
 * Orquestador de la historia "Ubicación de firmas por usuario": un único DndContext (aparte del
 * que ya usa CollaboratorsFieldArray.tsx para reordenar la lista — árboles independientes, sin
 * colisión de ids) que conecta la barra de chips con el PDF, delegando toda la decisión de
 * negocio (agregar/mover/rechazar) a `resolveSignatureDrop`. Escribe posiciones vía `setValue`
 * apuntado a `collaborators.{i}.signatures`, no un segundo `useFieldArray` — evita desincronizar
 * el `useFieldArray` que ya es dueño de la lista de colaboradores.
 */
export default function SignaturePlacementField({
  file,
  control,
  getValues,
  setValue,
}: SignaturePlacementFieldProps) {
  const collaborators = useWatch({ control, name: 'collaborators' });
  const [activeDrag, setActiveDrag] = useState<SignatureDragPayload | null>(
    null,
  );
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const [rejectionNonce, setRejectionNonce] = useState(0);

  // distance:4 evita que un simple click en un chip o en el botón de borrar de una caja se
  // interprete como el inicio de un arrastre.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Memoizado por `collaborators`: evita que `signers`/`boxesByPage` sean objetos nuevos en cada
  // render (incluido el que dispara `setActiveDrag` al iniciar un arrastre) y que
  // `SignaturePlacementPdfPreview` se re-renderice sin necesidad mientras se arrastra.
  const { signers, boxesByPage } = useMemo(() => {
    const signers: SignerChipData[] = [];
    const boxesByPage = new Map<number, PlacedBoxView[]>();

    collaborators.forEach((collaborator, index) => {
      if (collaborator.collaboratorType !== 'SIGNER') return;

      const displayName = `${collaborator.firstName} ${collaborator.lastName}`.trim();
      signers.push({
        collaboratorIndex: index,
        label: displayName || `Firmante ${index + 1}`,
        colorClassName: colorFor(index),
        placedCount: collaborator.signatures.length,
      });

      const upperLabel = (displayName || `Firmante ${index + 1}`).toUpperCase();
      for (const position of collaborator.signatures) {
        const boxesOnPage = boxesByPage.get(position.page) ?? [];
        boxesOnPage.push({
          id: position.id,
          collaboratorIndex: index,
          page: position.page,
          xRatio: position.xRatio,
          yRatio: position.yRatio,
          widthRatio: position.widthRatio,
          heightRatio: position.heightRatio,
          label: upperLabel,
          colorClassName: colorFor(index),
        });
        boxesByPage.set(position.page, boxesOnPage);
      }
    });

    return { signers, boxesByPage };
  }, [collaborators]);

  // `PointerSensor` cancela automáticamente cualquier arrastre en curso si `window` dispara un
  // evento `resize` (protección legítima contra coordenadas obsoletas si el usuario redimensiona
  // la ventana a mitad de un arrastre — ver AbstractPointerSensor en @dnd-kit/core). El problema:
  // en este árbol (barra de chips + PDF con zonas de suelta dentro de un contenedor
  // `overflow-y-auto`), iniciar CUALQUIER arrastre dispara de forma consistente y reproducible un
  // `resize` real de `window` con las mismas dimensiones reportadas (confirmado en Chromium
  // headless y headed, y en build de producción — no es un artefacto de `next dev` ni de
  // Playwright). Se descartó como causa: el propio `DragOverlay`, el render de `<Page>` de
  // react-pdf, y el `ResizeObserver` de `SignaturePlacementPdfPreview` (el resize fantasma
  // persiste con cualquiera de los tres deshabilitado); el arrastre de reordenar ya existente en
  // `CollaboratorsFieldArray.tsx` NO lo dispara, así que no es un problema genérico del entorno o
  // de dnd-kit. Sin una causa aislada a una sola línea, se neutraliza el síntoma con seguridad:
  // un listener de `resize` registrado en `window` desde el montaje (antes de que exista ningún
  // arrastre) se ejecuta ANTES que el que `PointerSensor` añade recién al activarse un arrastre
  // (los listeners de un mismo target se invocan en orden de registro), así que puede llamar
  // `stopImmediatePropagation()` para impedir que el cancelador de dnd-kit llegue a verse
  // — solo mientras `activeDragRef` está en true, así que un resize real del usuario a mitad de
  // otra interacción (fuera de un arrastre de firma) se sigue propagando sin cambios.
  const activeDragRef = useRef(false);
  useEffect(() => {
    function suppressPhantomResize(event: Event) {
      if (activeDragRef.current) {
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener('resize', suppressPhantomResize, true);
    return () =>
      window.removeEventListener('resize', suppressPhantomResize, true);
  }, []);

  function flashReject(dragId: string) {
    setRejectedId(dragId);
    setRejectionNonce((n) => n + 1);
    window.setTimeout(() => {
      setRejectedId((current) => (current === dragId ? null : current));
    }, REJECT_FLASH_MS);
  }

  function handleDragStart(event: DragStartEvent) {
    activeDragRef.current = true;
    setActiveDrag(event.active.data.current as SignatureDragPayload);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    activeDragRef.current = false;
    setActiveDrag(null);

    const dragPayload = active.data.current as SignatureDragPayload;
    const result = resolveSignatureDrop({
      dragPayload,
      pageNumber:
        (over?.data.current as { pageNumber: number } | undefined)
          ?.pageNumber ?? null,
      activeRect: active.rect.current.translated,
      containerRect: over?.rect ?? null,
      collaborators: getValues('collaborators'),
      createId: () => crypto.randomUUID(),
    });

    if (result.outcome === 'rejected') {
      flashReject(String(active.id));
      return;
    }
    if (result.outcome === 'committed') {
      setValue(
        `collaborators.${result.collaboratorIndex}.signatures`,
        result.signatures,
        { shouldDirty: true },
      );
    }
  }

  const handleDeleteBox = useCallback(
    (collaboratorIndex: number, signatureId: string) => {
      const collaborator = getValues(`collaborators.${collaboratorIndex}`);
      if (collaborator.collaboratorType !== 'SIGNER') return;
      setValue(
        `collaborators.${collaboratorIndex}.signatures`,
        collaborator.signatures.filter(
          (position) => position.id !== signatureId,
        ),
        { shouldDirty: true },
      );
    },
    [getValues, setValue],
  );

  function handleDragCancel() {
    activeDragRef.current = false;
    setActiveDrag(null);
  }

  const dragLabel =
    activeDrag &&
    (signers.find((s) => s.collaboratorIndex === activeDrag.collaboratorIndex)
      ?.label ??
      '');

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full flex-col">
        <SignerChipsBar
          signers={signers}
          rejectedId={rejectedId}
          rejectionNonce={rejectionNonce}
        />
        <div className="min-h-0 flex-1">
          <SignaturePlacementPdfPreview
            file={file}
            boxesByPage={boxesByPage}
            rejectedId={rejectedId}
            rejectionNonce={rejectionNonce}
            onDeleteBox={handleDeleteBox}
          />
        </div>
      </div>
      {/*
        DragOverlay es necesario por dos razones: (1) la fuente puede ser un chip pequeño y el
        destino una caja rectangular — el overlay puede tener la forma del destino sin importar
        qué se esté arrastrando; (2) las páginas viven en un contenedor `overflow-y-auto` — un
        nodo arrastrado sin overlay se recortaría al salir de ese contenedor. `dropAnimation=null`
        evita que el overlay "vuele" a la posición final justo antes de un posible flash de
        rechazo, que se leería como un glitch.
      */}
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div
            className={cn(
              'flex items-center justify-center rounded border-2 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase',
              colorFor(activeDrag.collaboratorIndex),
            )}
          >
            {dragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
