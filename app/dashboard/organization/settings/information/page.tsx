import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';

import OrganizationInformationView from './_components/OrganizationInformationView';

/**
 * Información de la organización activa.
 *
 * Exige `ORGANIZATION.READ` para entrar, el mismo permiso que pide el endpoint que la surte. La
 * pantalla es de sólo lectura, así que no hay un segundo permiso que decidir dentro.
 */
export default async function OrganizationInformationPage() {
  await assertPagePermission('ORGANIZATION.READ');

  return <OrganizationInformationView />;
}
