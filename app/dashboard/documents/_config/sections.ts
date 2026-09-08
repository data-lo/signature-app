import { FilePlus, Files, type LucideIcon } from 'lucide-react';

/**
 * Fuente única de verdad del módulo de documentos: nombre, ruta e icono de cada entrada.
 * AppSidebar y DashboardBreadcrumbs consumen exactamente estas constantes, así que el nombre
 * mostrado en el sidebar y el del breadcrumb nunca pueden divergir.
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
  /** Nombre mostrado en el sidebar y como segundo nivel del breadcrumb. */
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
      label: 'Nuevo documento',
      href: `${DOCUMENTS_BASE_PATH}/create`,
      icon: FilePlus,
    },
  };

/** Orden en el que se listan las entradas del módulo en el sidebar. */
export const DOCUMENTS_NAV_SECTIONS: DocumentsSection[] = [
  DOCUMENTS_SECTIONS.list,
  DOCUMENTS_SECTIONS.create,
];
