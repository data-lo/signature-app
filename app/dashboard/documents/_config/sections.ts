import { FilePlus, Files, type LucideIcon } from 'lucide-react';

/**
 * Fuente única de verdad del módulo de documentos: nombre, ruta e icono de cada entrada.
 * AppSidebar, DashboardBreadcrumbs y el botón de alta de DocumentsView consumen exactamente
 * estas constantes, así que el nombre mostrado en el sidebar, el del breadcrumb y el del botón
 * nunca pueden divergir.
 *
 * **El módulo dejó de estar segmentado.** Antes vivían aquí tres secciones —"Por firmar",
 * "Enviados para firma" y "Completados"— cada una con su ruta, su combinación de parámetros y su
 * propia caché. Repartían la misma bandeja en tres listas incombinables: no había manera de
 * buscar un documento sin saber de antemano en cuál de las tres había caído, y el mismo documento
 * cambiaba de sección al firmarlo sin que nadie lo hubiera movido. Ahora hay una sola lista con
 * búsqueda y filtros, y lo que antes era la sección es un filtro más (`view`).
 */

export const DOCUMENTS_BASE_PATH = '/dashboard/documents';

export type DocumentsSectionKey = 'list' | 'create';

export interface DocumentsSection {
  key: DocumentsSectionKey;
  /**
   * Nombre mostrado en el breadcrumb, en el encabezado de la pantalla y —cuando la sección
   * figura en `DOCUMENTS_NAV_SECTIONS`— en el sidebar.
   */
  label: string;
  href: string;
  icon: LucideIcon;
}

export const DOCUMENTS_SECTIONS: Record<DocumentsSectionKey, DocumentsSection> =
  {
    list: {
      key: 'list',
      label: 'Documentos',
      href: DOCUMENTS_BASE_PATH,
      icon: Files,
    },
    create: {
      key: 'create',
      label: 'Crear documento',
      href: `${DOCUMENTS_BASE_PATH}/create`,
      icon: FilePlus,
    },
  };

/**
 * Entradas del módulo en el sidebar: sólo el listado.
 *
 * El alta NO figura acá a propósito. Era una entrada hermana de la lista, al mismo nivel, como
 * si fueran dos módulos distintos; crear un documento no es un módulo, es una acción sobre la
 * bandeja. Ahora se entra por el botón de la propia pantalla de Documentos y la ruta
 * `/dashboard/documents/create` sigue existiendo igual —accesible por URL directa y desde
 * cualquier redirección previa—, sólo que ya no se anuncia como destino independiente.
 */
export const DOCUMENTS_NAV_SECTIONS: DocumentsSection[] = [
  DOCUMENTS_SECTIONS.list,
];
