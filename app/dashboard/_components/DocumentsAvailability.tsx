'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBillingAccess } from '@/lib/hooks/useBillingAccess';

/** Destino del botón: la pantalla donde se compran documentos sueltos y se administra el plan. */
export const SUBSCRIPTIONS_ROUTE = '/dashboard/subscriptions';

export const ADD_DOCUMENTS_LABEL = 'Agregar Documentos';

/**
 * Rotula el saldo de documentos de la cuenta activa.
 *
 * **Sólo la cantidad disponible, sin tope ni fracción.** El tope por periodo que sí muestra la
 * tarjeta de suscripción (`SubscriptionStateCard`) no cabe acá: la barra superior responde "¿me
 * quedan documentos?" de un vistazo, y un "3 de 50" obliga a hacer la cuenta para contestarla.
 *
 * @param credits - Documentos que la cuenta puede consumir hoy.
 * @returns La leyenda ya concordada en número.
 * @throws Nada.
 *
 * @example
 * ```ts
 * availabilityLabel(12); // '12 Documentos Disponibles'
 * availabilityLabel(1); // '1 Documento Disponible'
 * ```
 */
export function availabilityLabel(credits: number): string {
  return credits === 1
    ? '1 Documento Disponible'
    : `${credits} Documentos Disponibles`;
}

/**
 * Saldo de documentos de la cuenta activa y el acceso para comprar más, para la barra superior.
 *
 * El saldo sale de `useBillingAccess`, que es la consulta única de facturación y ya va montada en
 * `AuthProvider`: montarla acá comparte esa misma `queryKey`, así que no cuesta ninguna petición
 * extra y el número se redibuja solo cuando el dato cambia —al cambiar de cuenta (la cuenta va en
 * la llave), al comprar documentos, al mover la suscripción y al crear un documento, que gasta un
 * crédito (ver `useCreateDocumentSignatures`)—. Deliberadamente NO se usa
 * `DocumentsCountContext`: aquél publica cuántos documentos se han creado, que es lo contrario de
 * cuántos quedan por crear.
 *
 * Mientras el saldo no se conoce no se escribe ninguna cifra: un `0` provisional diría que la
 * cuenta se quedó sin documentos, que es justo lo que hay que evitar afirmar sin saberlo. El botón
 * sí se dibuja desde el primer render —no depende del saldo— para que la barra no cambie de alto
 * ni mueva el breadcrumb cuando llega la respuesta.
 *
 * @returns El bloque con la leyenda del saldo y el botón a Suscripciones.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DocumentsAvailability />
 * ```
 */
export default function DocumentsAvailability() {
  const { data: billing } = useBillingAccess();

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:shrink-0 sm:flex-nowrap">
      {billing ? (
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {availabilityLabel(billing.creditsAvailable)}
        </span>
      ) : null}

      {/* Un `Link` vestido con `buttonVariants()` y NO un `<Button render={<Link />}>`: lo que
          esto hace es navegar, así que tiene que llegar al navegador —y al lector de pantalla—
          como un enlace de verdad, con su `href` abrible en otra pestaña. El `Button` de Base UI
          envuelto sobre un `<a>` le encima `role="button"` y lo deja fuera de la lista de enlaces
          de la página. El aspecto es el mismo botón primario: sale de las mismas clases. */}
      <Link
        href={SUBSCRIPTIONS_ROUTE}
        className={cn(buttonVariants(), 'whitespace-nowrap')}
      >
        <Plus className="size-4" aria-hidden />
        {ADD_DOCUMENTS_LABEL}
      </Link>
    </div>
  );
}
