import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';

import OrganizationInformationView from './_components/OrganizationInformationView';

/**
 * Información de la organización activa.
 *
 * Exige `ORGANIZATION.READ` para entrar, el mismo permiso que pide el endpoint que la surte. Si
 * además se puede editar lo decide la vista con `ORGANIZATION.UPDATE`: quien sólo puede leer ve
 * la misma pantalla, sin formulario.
 */
export default async function OrganizationInformationPage() {
  await assertPagePermission('ORGANIZATION.READ');

  return <OrganizationInformationView />;
}
