'use client';

import Link from 'next/link';
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
import { DOCUMENTS_SECTIONS } from '../../_config/sections';

interface DocumentSentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de que el documento salió a firma. Sustituye al toast que había antes: el envío
 * cierra un flujo largo (cargar el PDF, configurarlo, elegir firmantes y ubicar las firmas) y su
 * confirmación trae información que el usuario necesita retener —que le llegará un correo y
 * dónde seguir el estado—, así que no puede desvanecerse sola a los pocos segundos.
 *
 * El nombre de la sección se toma de `DOCUMENTS_SECTIONS` y no se escribe a mano, para que
 * coincida siempre con lo que dice el sidebar al que se le está mandando al usuario.
 */
export default function DocumentSentDialog({
  open,
  onOpenChange,
}: DocumentSentDialogProps) {
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
                href={DOCUMENTS_SECTIONS.sent.href}
                className="font-medium text-emerald-600 hover:underline hover:underline-offset-3 dark:text-emerald-400"
              >
                {DOCUMENTS_SECTIONS.sent.label}
              </Link>
              .
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction>
            <ThumbsUp aria-hidden />
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
