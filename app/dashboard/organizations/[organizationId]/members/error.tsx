'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/app/dashboard/_components/PageContainer';

interface OrganizationMembersErrorProps {
  error: Error & { digest?: string };
  /** Vuelve a montar el segmento, lo que repite la petición SSR de la sección. */
  reset: () => void;
}

/**
 * Error boundary de la sección de miembros.
 *
 * Muestra un único mensaje para cualquier fallo, y es a propósito. Los dos casos que el usuario
 * SÍ puede distinguir y resolver —sesión caducada y falta de acceso a la organización— no llegan
 * hasta aquí: la sección los resuelve antes, redirigiendo al login o explicando la falta de
 * permisos. Lo que queda es un fallo del servidor o de la red, donde la única acción útil es
 * reintentar.
 *
 * Tampoco se intenta clasificar por código HTTP, como sí hace la pantalla de planes: aquélla
 * recibe el error de una consulta lanzada en el navegador, mientras que en producción Next
 * reemplaza el mensaje de un error lanzado en el servidor por uno genérico más un `digest`. Leer
 * ese mensaje para decidir qué mostrar funcionaría en desarrollo y fallaría en producción.
 *
 * @param props - El error del segmento y la función que lo vuelve a montar.
 * @returns La pantalla de error con la acción de reintento.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * // Lo monta Next cuando MembersSection lanza durante el render del servidor.
 * ```
 */
export default function OrganizationMembersError({
  error,
  reset,
}: OrganizationMembersErrorProps) {
  useEffect(() => {
    /*
      Mismo mecanismo que el resto del frontend (ver la pantalla de planes): el detalle va a la
      consola y nunca a la pantalla. Puede traer rutas internas del backend o el mensaje crudo de
      un proveedor, que no ayudan a quien está mirando y sí dicen de más.
    */
    console.error('[organization-members] error boundary', error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex max-w-md flex-col items-start gap-4">
        <AlertTriangle className="size-8 text-destructive" aria-hidden />

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium text-foreground">
            No fue posible cargar los miembros y permisos de la organización.
          </h1>
          <p className="text-sm text-muted-foreground">
            Puede ser un problema temporal. Vuelve a intentarlo; si sigue
            ocurriendo, avísale al equipo de soporte.
          </p>
        </div>

        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </PageContainer>
  );
}
