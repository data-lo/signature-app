'use client';

import { useRouter } from 'next/navigation';
import { PlugZap } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Pantalla para cuando no se pudieron resolver los permisos por un fallo de red o del backend.
 *
 * Es un estado recuperable, no un error: la sesión sigue siendo válida y la cuenta también, así
 * que lo que toca es reintentar, no cerrar sesión ni mandar a ninguna parte. `router.refresh()`
 * repite el render del layout en el servidor, que es exactamente lo que falló.
 *
 * Se distingue a propósito de la pantalla de acceso denegado: decirle "no tienes permiso" a quien
 * sí lo tiene, porque el backend no contestó, lo manda a pedirle accesos a un administrador que no
 * puede hacer nada por él.
 */
export default function AuthorizationUnavailableView() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <PlugZap className="size-7 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          No pudimos cargar tus accesos
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Hubo un problema al conectar con el servidor. Tu sesión sigue activa.
        </p>
      </div>

      <Button onClick={() => router.refresh()}>Reintentar</Button>
    </div>
  );
}
