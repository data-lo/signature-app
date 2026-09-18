import { assertPagePermission } from '@/lib/authorization/assert-page-permission.server';
import RolesView from './_components/RolesView';

/**
 * Roles y permisos de la organización.
 *
 * Exige `ROLE.READ` para entrar; crear y editar roles pide `ROLE.MANAGE`, que se decide dentro de
 * la pantalla. Son dos permisos distintos a propósito: ver cómo está repartido el control y
 * repartirlo no son la misma facultad.
 */
export default async function OrganizationRolesPage() {
  await assertPagePermission('ROLE.READ');

  return <RolesView />;
}
