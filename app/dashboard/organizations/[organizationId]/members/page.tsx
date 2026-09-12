import MembersSection from './_components/MembersSection';

interface OrganizationMembersPageProps {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ includeInactive?: string }>;
}

/**
 * Página de administración de miembros de una organización.
 *
 * Deliberadamente mínima: sólo resuelve los parámetros de la ruta y compone la sección. No pide
 * datos, no tiene estado de carga ni de error —de eso se encargan `loading.tsx`, `error.tsx` y la
 * propia sección—, y por eso no hay nada aquí que revisar cuando cambie el origen de los datos.
 *
 * El `organizationId` viaja en la URL y no se toma de la cuenta activa por una razón concreta:
 * esa cuenta vive en `localStorage` y el servidor no puede leerla, así que sin el parámetro no
 * habría forma de renderizar esta pantalla en el servidor. Que venga de la URL no lo hace fiable
 * —quien sea puede escribir otro—; la pertenencia la comprueba el backend en cada petición.
 *
 * @param props - Parámetros de ruta y de consulta que entrega Next.
 * @returns La sección de miembros, renderizada en el servidor.
 * @throws Propaga lo que lance la sección; Next lo entrega a `error.tsx`.
 *
 * @example
 * ```tsx
 * // GET /dashboard/organizations/org-1/members?includeInactive=true
 * <OrganizationMembersPage params={params} searchParams={searchParams} />
 * ```
 */
export default async function OrganizationMembersPage({
  params,
  searchParams,
}: OrganizationMembersPageProps) {
  const [{ organizationId }, { includeInactive }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <MembersSection
      organizationId={organizationId}
      includeInactive={includeInactive === 'true'}
    />
  );
}
