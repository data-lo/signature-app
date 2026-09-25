'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThumbsUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DocumentView } from '@/lib/enums/document';
import { DOCUMENT_VIEW_LABELS } from '../../_config/filters';
import { DOCUMENTS_SECTIONS } from '../../_config/sections';

interface DocumentSentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Listado de documentos con el recorte "Creados por mí": ahí aparece siempre la solicitud recién
 * enviada. Lo comparten el enlace del mensaje y el botón "Entendido", para que ambos lleven al
 * mismo lugar.
 */
export const CREATED_BY_ME_DOCUMENTS_HREF = `${DOCUMENTS_SECTIONS.list.href}?view=${DocumentView.CreatedByMe}`;

/**
 * Confirmación de que el documento salió a firma, que al reconocerla lleva al listado de documentos.
 *
 * Sustituye al toast que había antes: el envío cierra un flujo largo (cargar el PDF, configurarlo,
 * elegir firmantes y ubicar las firmas) y su confirmación trae información que el usuario necesita
 * retener —que le llegará un correo y dónde seguir el estado—, así que no puede desvanecerse sola
 * a los pocos segundos.
 *
 * "Entendido" es un `AlertDialogAction` (un `Close` de base-ui): el clic cierra el modal y, además,
 * navega a `CREATED_BY_ME_DOCUMENTS_HREF`. El listado vuelve a pedir los documentos al montarse y
 * `useCreateDocumentSignatures` ya invalidó la caché `documents` en el `onSuccess`, así que la
 * solicitud nueva aparece sin recargar. Cerrar con Escape NO redirige: sólo el botón expresa la
 * intención de ir al listado.
 *
 * El nombre del recorte se toma de `DOCUMENT_VIEW_LABELS` y no se escribe a mano, para que
 * coincida con el filtro que el enlace deja aplicado al llegar al listado.
 *
 * @param props.open - Si el modal está visible.
 * @param props.onOpenChange - Recibe cada cambio de visibilidad, incluido el cierre desde "Entendido".
 * @returns El AlertDialog de confirmación.
 *
 * @example
 * ```tsx
 * <DocumentSentDialog open={isSentDialogOpen} onOpenChange={setIsSentDialogOpen} />
 * ```
 */
export default function DocumentSentDialog({
  open,
  onOpenChange,
}: DocumentSentDialogProps) {
  const router = useRouter();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Solicitud de firma enviada</AlertDialogTitle>
          {/* `render` cambia el <p> por defecto por un <div>: el mensaje son varios párrafos y
              anidarlos dentro de un <p> daría HTML inválido. */}
          <AlertDialogDescription
            render={<div />}
            className="flex flex-col gap-2"
          >
            <p>
              Tu solicitud de firma se envió correctamente.
            </p>
            <p>
              Los participantes recibirán una invitación para revisar y firmar
              el documento. Te notificaremos por correo cuando el proceso
              finalice.
            </p>
            <p>
              Consulta el estado de tu solicitud en{' '}
              {/* El estilo de enlace del componente solo alcanza a los hijos directos de la
                  descripción, y aquí el <a> va dentro de un <p>: se aplica a mano para que se
                  vea como enlace y no como texto plano. */}
              <Link
                href={CREATED_BY_ME_DOCUMENTS_HREF}
                className="font-medium text-emerald-600 hover:underline hover:underline-offset-3 dark:text-emerald-400"
              >
                {DOCUMENT_VIEW_LABELS[DocumentView.CreatedByMe]}
              </Link>
              .
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => router.push(CREATED_BY_ME_DOCUMENTS_HREF)}
          >
            <ThumbsUp aria-hidden />
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
