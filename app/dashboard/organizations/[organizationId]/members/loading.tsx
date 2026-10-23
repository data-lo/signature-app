import PageContainer from '@/app/dashboard/_components/PageContainer';
import { SectionLoading } from '@/components/ui/section-loading';

/**
 * Estado de carga de la sección de miembros.
 *
 * Next lo monta solo al navegar hacia aquí y lo mantiene hasta que la petición SSR de
 * `MembersSection` resuelve. No hay que dispararlo ni coordinarlo desde ningún sitio: es el
 * respaldo del límite de Suspense que el propio enrutador coloca alrededor del segmento.
 *
 * @returns El esqueleto compartido de sección, dentro del contenedor de página habitual.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * // Se muestra automáticamente durante la navegación a
 * // /dashboard/organizations/org-1/members
 * ```
 */
export default function OrganizationMembersLoading() {
  return (
    <PageContainer>
      <SectionLoading label="Cargando los miembros de la organización" />
    </PageContainer>
  );
}
