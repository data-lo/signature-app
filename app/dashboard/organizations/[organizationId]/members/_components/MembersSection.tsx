import { redirect } from 'next/navigation';
import PageContainer from '@/app/dashboard/_components/PageContainer';
import { BackendRequestError } from '@/lib/server/backend-request';
import { getOrganizationMembersAction } from '@/app/server-actions/organizations/get-organization-members.server-action';
import type { OrganizationMember } from '@/lib/api/organization-members';
import MembersManager from './MembersManager';
import MembersEmptyState from './MembersEmptyState';

interface MembersSectionProps {
  organizationId: string;
}

/**
 * Sección de miembros y permisos, resuelta enteramente en el servidor.
 *
 * Aquí vive todo lo que la página no tiene: la petición, la interpretación del fallo y el
 * reparto entre tabla y estado vacío. El navegador no hace ninguna petición inicial; recibe el
 * HTML ya con los datos y sólo hidrata las partes interactivas.
 *
 * Una sola consulta: el listado de miembros trae ya los permisos que cada uno hereda de su rol.
 * El catálogo de etiquetas de la organización se pedía aquí en paralelo para el modal "Etiquetas
 * del catálogo"; esa opción se retiró de la sección, y con ella la consulta que la alimentaba.
 *
 * @param props - Organización de la ruta.
 * @returns La sección renderizada: tabla con miembros, o estado vacío si no hay ninguno.
 * @throws Relanza cualquier fallo que no sea 401 ni 403 para que lo recoja `error.tsx`. El 401
 * redirige al login y el 403 se renderiza como falta de acceso, porque ambos tienen una salida
 * concreta que una pantalla de error genérica escondería.
 *
 * @example
 * ```tsx
 * <MembersSection organizationId="org-1" />
 * ```
 */
export default async function MembersSection({
  organizationId,
}: MembersSectionProps) {
  let members: OrganizationMember[];

  try {
    members = await getOrganizationMembersAction(organizationId);
  } catch (error) {
    if (error instanceof BackendRequestError && error.status === 401) {
      // La cookie caducó o se limpió entre la navegación y el render. Mandarlo al login es la
      // única acción útil, y es lo que ya hace el interceptor de axios en el cliente.
      redirect('/login');
    }

    if (error instanceof BackendRequestError && error.status === 403) {
      return (
        <PageContainer>
          <div className="flex max-w-md flex-col gap-1">
            <h1 className="text-lg font-semibold">Miembros</h1>
            <p className="text-sm text-muted-foreground">
              No tienes acceso a los miembros de esta organización.
            </p>
          </div>
        </PageContainer>
      );
    }

    console.error(
      '[organization-members] falló la carga en el servidor de la sección:',
      error,
    );
    throw error;
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      {members.length === 0 ? (
        <MembersEmptyState organizationId={organizationId} />
      ) : (
        <MembersManager
          organizationId={organizationId}
          members={members}
        />
      )}
    </PageContainer>
  );
}
