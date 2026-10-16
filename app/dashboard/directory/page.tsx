import { assertPageAnyPermission } from '@/lib/authorization/assert-page-permission.server';
import { DASHBOARD_NAVIGATION } from '@/lib/authorization/navigation-permissions';
import DirectoryView from './_components/DirectoryView';

/**
 * `/dashboard/directory`: contactos reutilizables para configurar firmantes o testigos.
 *
 * Exige `DIRECTORY.READ` para entrar, el mismo permiso que muestra la entrada del menú. Una cuenta
 * personal lo tiene siempre (el backend se lo concede desde el catálogo, sin rol); una
 * organización, según el rol del miembro. Crear, actualizar y eliminar piden su propio permiso y
 * se deciden dentro de la pantalla.
 */
export default async function DirectoryPage() {
  await assertPageAnyPermission(DASHBOARD_NAVIGATION.directory.anyPermissions);

  return <DirectoryView />;
}
