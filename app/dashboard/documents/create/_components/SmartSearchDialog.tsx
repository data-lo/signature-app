'use client';

import { Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SmartSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recibe la decisión del usuario y continúa el envío con ella. */
  onDecide: (isIndexable: boolean) => void;
}

/**
 * Última decisión antes de mandar el documento: si entra o no a Búsqueda Inteligente.
 *
 * **Se pregunta acá y no como un campo más del formulario** porque no es configuración del
 * documento —no cambia quién firma, ni cómo, ni dónde— sino una preferencia sobre qué hacemos
 * con él después. Metida en el acordeón de "Configurar firma" competiría por atención con las
 * decisiones que sí condicionan el envío, y en el resumen fijo sumaría un renglón a algo que se
 * lee para verificar firmantes.
 *
 * **La opción por omisión es agregarlo**, y por eso ocupa el botón de confirmación: la regla de
 * producto es que todo documento sea encontrable salvo que su autor decida lo contrario. Quien
 * pulsa Enter o el botón primario —el camino de menor resistencia— obtiene un documento
 * indexable, que es el mismo resultado que si el modal no existiera.
 *
 * **No bloquea: cierra decidiendo.** Los dos botones continúan el envío, sólo que con un valor
 * distinto; no hay una salida que descarte el documento. Cerrar por fuera (Escape, clic en el
 * fondo) sí cancela el envío y devuelve al formulario intacto — es la única forma de arrepentirse
 * de haber pulsado "Enviar", y perderla obligaría a elegir entre dos opciones a quien sólo
 * quería volver.
 */
export default function SmartSearchDialog({
  open,
  onOpenChange,
  onDecide,
}: SmartSearchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
            ¿Deseas agregar este documento a la Búsqueda Inteligente?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Al agregarlo, podrás encontrarlo más rápido mediante búsquedas
            inteligentes y precisas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {/**
           * "No agregar" va en el botón secundario y no en el de cerrar por descarte: es una
           * elección legítima, no un arrepentimiento, y tiene que llevar al mismo sitio que la
           * otra —el documento se envía igual—.
           */}
          <AlertDialogCancel onClick={() => onDecide(false)}>
            No agregar
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onDecide(true)}>
            Agregar a Búsqueda Inteligente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
