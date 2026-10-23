'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentView } from '@/lib/enums/document';
import { DOCUMENTS_SECTIONS } from '../../_config/sections';

interface SignatureSuccessDialogProps {
  open: boolean;
  /**
   * `true` sólo si ESTA firma fue la última que faltaba. Lo dice el backend en la respuesta de
   * firmar (`documentCompleted`), no el detalle cargado en la pantalla: ese describe el documento
   * como estaba ANTES de firmar, y usarlo diría "faltan firmantes" incluso cuando ya no falta
   * ninguno.
   */
  documentCompleted: boolean;
  /**
   * Cierre del modal, por el botón o por cualquier otra vía (Escape, clic fuera, la "X"). Todas
   * llevan al mismo sitio a propósito: quien cierra ya leyó la confirmación, y que la pantalla
   * haga una cosa distinta según CÓMO se cerró sólo sería desconcertante.
   */
  onClose: () => void;
}

/**
 * Acuse de la firma, mostrado en cuanto el backend la registra.
 *
 * **Un modal y no un toast.** Firmar es la acción más consecuente del producto y su acuse se leía
 * en un aviso que se desvanecía solo mientras la pantalla, además, navegaba a otra sección: el
 * firmante se quedaba sin saber si su firma había quedado registrada ni qué pasaba después. Acá
 * la confirmación espera a que la lean, y la navegación ocurre al cerrarla.
 *
 * **Lo que dice depende de si el documento quedó completo**, porque son dos situaciones
 * distintas para quien firmó. Si todavía faltan participantes, lo que le toca es esperar un aviso
 * — y el texto no puede mandarlo a "Completados" a buscar algo que aún no está ahí. Si su firma
 * fue la última, el documento ya existe terminado y ahí sí puede ir a verlo.
 */
export default function SignatureSuccessDialog({
  open,
  documentCompleted,
  onClose,
}: SignatureSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            {documentCompleted
              ? 'Este documento ha sido firmado y completado correctamente.'
              : 'Este documento ha sido firmado por ti.'}
          </DialogTitle>
          {/* `render={<div />}` porque el caso pendiente son DOS párrafos y el elemento por
            defecto de la descripción es un `<p>`: anidar párrafos dentro de un párrafo produce
            un HTML que el navegador reacomoda solo, partiendo el bloque en pedazos sueltos. */}
          <DialogDescription render={<div />} className="flex flex-col gap-2">
            {documentCompleted ? (
              <p>Puedes consultarlo en la sección de documentos completados.</p>
            ) : (
              <>
                <p>
                  Si hay más participantes pendientes de firma, te
                  notificaremos cuando el documento se haya completado.
                </p>
                <p>
                  Podrás consultarlo en la sección de documentos completados
                  cuando todas las firmas hayan sido registradas.
                </p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {/* Lleva al listado unificado con el recorte de completados ya puesto. Antes apuntaba
            a la sección "Completados", que era una ruta propia; ahora es un filtro de la única
            pantalla de documentos, y el `?view=` es lo que conserva el destino que el texto
            promete. */}
          <Button
            nativeButton={false}
            render={
              <Link
                href={`${DOCUMENTS_SECTIONS.list.href}?view=${DocumentView.Completed}`}
              />
            }
          >
            Ver documentos completados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
