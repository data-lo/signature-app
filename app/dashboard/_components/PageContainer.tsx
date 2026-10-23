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
 */
export default function PageContainer({ children, className }: PageContainerProps) {
  return <main className={cn('w-full px-8 py-8', className)}>{children}</main>;
}
