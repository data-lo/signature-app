import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor compartido para el contenido de las pantallas autenticadas: ocupa todo el ancho
 * disponible dentro de `SidebarInset` (sin `max-w`/`mx-auto`) y solo aporta el margen lateral y
 * vertical, para que tablas/formularios/listados no queden innecesariamente angostos.
 *
 * `min-w-0` para que un hijo ancho (una tabla con ancho mínimo) desborde dentro de su propio
 * contenedor de desplazamiento y no ensanche la pantalla. El margen lateral baja a 16 px en
 * pantallas angostas, donde 32 px por lado le quitaban casi un quinto del ancho al contenido.
 */
export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn('w-full min-w-0 px-4 py-6 md:px-8 md:py-8', className)}
    >
      {children}
    </main>
  );
}
