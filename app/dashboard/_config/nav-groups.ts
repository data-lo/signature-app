/**
 * Nombres de los módulos del dashboard, compartidos por el menú lateral y los breadcrumbs.
 *
 * Las claves son las mismas que identifican a los grupos en `NAV_GROUPS` (AppSidebar), y los
 * valores, los rótulos que ve el usuario. Viven aquí y no dentro de AppSidebar porque los
 * breadcrumbs los necesitan para el nivel padre de cada pantalla: importarlos del componente
 * arrastraría el menú entero —con sus hooks y su estado— a un módulo que sólo quiere un texto.
 *
 * El módulo de documentos NO está acá: tiene su propia configuración en
 * `documents/_config/sections.ts`, donde el nombre viene acompañado de ruta e icono porque esa
 * entrada sí es una pantalla. Estos tres son agrupadores sin página propia.
 *
 * @example
 * ```ts
 * NAV_GROUP_LABELS.payments; // 'Pagos'
 * ```
 */
export const NAV_GROUP_LABELS = {
  payments: 'Pagos',
  settings: 'Configuración',
  organization: 'Organización',
} as const;
