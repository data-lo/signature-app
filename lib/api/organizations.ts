import apiClient from '@/lib/axios';

/**
 * El perfil de una organización — espejo de `OrganizationProfileData` en el backend
 * (`src/account/interfaces/response/organization-response.ts`).
 *
 * Los campos opcionales llegan en `null` y no ausentes: una organización que nunca capturó su
 * domicilio es distinta de una respuesta que se lo dejó fuera, y la pantalla lo pinta como "Sin
 * capturar" en vez de en blanco.
 */
export interface OrganizationProfile {
  id: string;
  /** Razón social: el nombre legal completo. */
  name: string;
  /** Nombre corto con el que la organización se presenta en la interfaz. */
  displayName: string;
  rfc: string | null;
  phoneNumber: string | null;
  address: string | null;
  domainAllowed: string | null;
  isActive: boolean;
}

/**
 * Pide el perfil de una organización (`GET /organizations/:organizationId`).
 *
 * Es la única lectura que devuelve RFC, teléfono, domicilio y dominio permitido: el catálogo de
 * cuentas (`GET /accounts/me`) publica sólo razón social y nombre de visualización, porque es lo
 * que rotula el selector de cuentas.
 *
 * @param organizationId - Organización cuyo perfil se pide.
 * @returns El perfil de la organización.
 *
 * @throws {AxiosError} 403 si quien pregunta no es miembro activo de esa organización o su rol no
 *   tiene `ORGANIZATION.READ`; 404 si no existe.
 *
 * @example
 * ```ts
 * const organization = await getOrganizationRequest('org-1');
 * organization.rfc; // 'ACM010101AAA'
 * ```
 */
export async function getOrganizationRequest(
  organizationId: string,
): Promise<OrganizationProfile> {
  const { data } = await apiClient.get<{
    success: boolean;
    message: string;
    data: OrganizationProfile;
  }>(`/api/v1/organizations/${organizationId}`);

  return data.data;
}
