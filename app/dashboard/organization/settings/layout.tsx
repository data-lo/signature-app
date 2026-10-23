import type { ReactNode } from 'react';
import PageContainer from '@/app/dashboard/_components/PageContainer';

/**
 * Contenedor de la configuración de la organización.
 *
 * Ya no dibuja pestañas. Las tenía mientras convivían aquí "Miembros" y "Permisos"; al mudarse la
 * administración de miembros a su propia ruta renderizada en el servidor
 * (`/dashboard/organizations/[organizationId]/members`), lo que quedaba era una barra de una sola
 * pestaña: un control que no lleva a ningún otro sitio y que sólo ocupa espacio.
 *
 * Con las pestañas se fue también el montaje diferido al cliente que las acompañaba. Existía por
 * un desajuste de hidratación de `TabsTrigger` con `render={<Link />}`, así que sin ellas este
 * layout puede volver a ser un Server Component.
 *
 * @param props - Contenido de la ruta hija.
 * @returns El contenedor de página con el contenido dentro.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * // Envuelve a /dashboard/organization/settings/permissions
 * ```
 */
export default function OrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PageContainer className="flex flex-col gap-6">{children}</PageContainer>;
}
