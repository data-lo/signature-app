import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';
import MembersSection from './_components/MembersSection';

interface OrganizationMembersPageProps {
  params: Promise<{ organizationId: string }>;
}

/**
 * Página de administración de miembros de una organización.
 *
 * Deliberadamente mínima: sólo resuelve los parámetros de la ruta y compone la sección. No pide
 * datos, no tiene estado de carga ni de error —de eso se encargan `loading.tsx`, `error.tsx` y la
 * propia sección—, y por eso no hay nada aquí que revisar cuando cambie el origen de los datos.
 *
 * El `organizationId` viaja en la URL y no se toma de la cuenta activa: la sección se puede
 * enlazar directamente, y la URL es lo que de verdad se está pidiendo. Que venga de ahí no lo
 * hace fiable —quien sea puede escribir otro—; la pertenencia la comprueba el backend en cada
 * petición.
 *
 * Exige `MEMBER.READ` sobre la CUENTA ACTIVA. Es una comprobación de navegación, no de acceso:
 * impide que alguien sin nada que hacer aquí reciba la pantalla, pero quien manipule la URL para
 * pedir los miembros de otra organización se topa con el 403 del backend, que es el que decide.
 *
 * @param props - Parámetros de ruta que entrega Next.
 * @returns La sección de miembros, renderizada en el servidor.
 * @throws Propaga lo que lance la sección; Next lo entrega a `error.tsx`.
 *
 * @example
 * ```tsx
 * // GET /dashboard/organizations/org-1/members
 * <OrganizationMembersPage params={params} />
 * ```
 */
export default async function OrganizationMembersPage({
  params,
}: OrganizationMembersPageProps) {
  await assertPagePermission('MEMBER.READ');

  const { organizationId } = await params;

  return <MembersSection organizationId={organizationId} />;
}
