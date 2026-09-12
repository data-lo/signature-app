'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useDocumentDetail } from '../documents/[documentId]/_hooks/useDocumentDetail';
import { DOCUMENTS_SECTIONS } from '../documents/_config/sections';
import { NAV_GROUP_LABELS } from '../_config/nav-groups';

interface Crumb {
  label: string;
  /** Sin `href` el nivel no es interactivo: o es un agrupador sin página propia, o es la página
   * actual, que siempre va al final. */
  href?: string;
}

/**
 * "Documentos" como nivel padre, y AHORA CON ENLACE.
 *
 * Mientras el módulo estuvo partido en tres secciones, este nivel era un agrupador muerto: no
 * había ninguna pantalla de "Documentos" a la que llevar, sólo un menú con tres rutas hermanas.
 * Con una sola lista, el padre es una página real y el breadcrumb puede hacer lo que promete.
 */
const DOCUMENTS_PARENT_CRUMB: Crumb = {
  label: DOCUMENTS_SECTIONS.list.label,
  href: DOCUMENTS_SECTIONS.list.href,
};

/** Breadcrumbs del módulo, derivados de la misma configuración que alimenta el sidebar para que
 * los nombres coincidan exactamente en ambos componentes. */
const DOCUMENTS_CRUMBS: Record<string, Crumb[]> = {
  // El listado es el nivel padre: repetirlo como hijo diría "Documentos / Documentos".
  [DOCUMENTS_SECTIONS.list.href]: [{ label: DOCUMENTS_SECTIONS.list.label }],
  [DOCUMENTS_SECTIONS.create.href]: [
    DOCUMENTS_PARENT_CRUMB,
    { label: DOCUMENTS_SECTIONS.create.label },
  ],
};

/**
 * El módulo como primer nivel, tal como se llama en el menú lateral.
 *
 * **Ninguno de estos tres lleva `href`, y no es un olvido.** Pagos, Configuración y Organización
 * son agrupadores del menú: agrupan pantallas hermanas pero no tienen una pantalla propia a la que
 * llevar. Un enlace ahí tendría que apuntar a la primera de sus hijas, que es otra cosa distinta de
 * "el módulo" —y volvería imposible distinguir, estando en Planes, si el breadcrumb ofrece subir un
 * nivel o quedarse donde ya está—. Se pintan atenuados, que es lo que el componente hace con un
 * `Crumb` sin `href` que no sea el último.
 */
const GROUP_CRUMB: Record<keyof typeof NAV_GROUP_LABELS, Crumb> = {
  payments: { label: NAV_GROUP_LABELS.payments },
  settings: { label: NAV_GROUP_LABELS.settings },
  organization: { label: NAV_GROUP_LABELS.organization },
};

/** Mapa estático ruta -> jerarquía de breadcrumbs, alineado con las etiquetas usadas en
 * AppSidebar —de donde salen literalmente los nombres de los módulos— y en las tabs de
 * configuración de organización, para mantener nombres consistentes. */
const STATIC_CRUMBS: Record<string, Crumb[]> = {
  ...DOCUMENTS_CRUMBS,
  // Crear organización cuelga del selector de cuentas, no de un módulo del menú: no hay grupo
  // padre que anteponerle.
  '/dashboard/organization/create': [{ label: 'Crear organización' }],
  '/dashboard/organization/settings/permissions': [
    GROUP_CRUMB.organization,
    { label: 'Permisos' },
  ],
  '/dashboard/personal-documents': [
    GROUP_CRUMB.settings,
    { label: 'Información personal' },
  ],
  '/dashboard/personal-documents/identity': [
    GROUP_CRUMB.settings,
    {
      label: 'Información personal',
      href: '/dashboard/personal-documents',
    },
    { label: 'Identidad y firma' },
  ],
  '/dashboard/plans': [GROUP_CRUMB.payments, { label: 'Planes' }],
  '/dashboard/subscriptions': [
    GROUP_CRUMB.payments,
    { label: 'Suscripciones' },
  ],
};

const DOCUMENT_DETAIL_PATTERN = /^\/dashboard\/documents\/([^/]+)$/;

/**
 * Administrar miembros, cuya ruta lleva el `organizationId`. No puede entrar en el mapa estático
 * por eso mismo, y no hace falta resolver el nombre de la organización: el nivel que se muestra
 * es la sección, no la organización.
 */
const ORGANIZATION_MEMBERS_PATTERN =
  /^\/dashboard\/organizations\/[^/]+\/members$/;

function useCrumbs(pathname: string): Crumb[] {
  // Las rutas de las secciones anteriores ya no llegan hasta acá: las redirige el servidor al
  // listado unificado (ver `next.config.ts`), así que el navegador nunca renderiza esa ruta.
  const staticCrumbs = STATIC_CRUMBS[pathname];
  // Solo se interpreta como un id de documento si la ruta no coincide con ninguna ruta estática
  // conocida (bug corregido: "/dashboard/documents/create" también matchea
  // DOCUMENT_DETAIL_PATTERN por ser un solo segmento, lo que disparaba un GET /document/create
  // inexistente y rompía sus propios breadcrumbs estáticos).
  const documentId = staticCrumbs
    ? undefined
    : pathname.match(DOCUMENT_DETAIL_PATTERN)?.[1];
  const { data: document } = useDocumentDetail(documentId ?? '', {
    enabled: !!documentId,
  });

  if (documentId) {
    return [
      DOCUMENTS_PARENT_CRUMB,
      { label: document?.fileName ?? 'Detalle del documento' },
    ];
  }

  if (ORGANIZATION_MEMBERS_PATTERN.test(pathname)) {
    return [GROUP_CRUMB.organization, { label: 'Administrar miembros' }];
  }

  return staticCrumbs ?? [];
}

export default function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = useCrumbs(pathname);

  if (crumbs.length === 0) return null;

  // `min-h-10` y no `h-10`: con el módulo como primer nivel, "Configuración / Información
  // personal / Identidad y firma" no cabe en una línea de teléfono. `BreadcrumbList` ya sabe
  // envolver (`flex-wrap`), pero con la altura fija la segunda línea se salía del recuadro y se
  // montaba sobre el contenido. El alto no cambia mientras quepa en una sola línea.
  return (
    <Breadcrumb className="flex min-h-10 items-center border-b border-border px-4 py-1">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem
                className={isLast ? 'min-w-0 max-w-[55vw] sm:max-w-xs' : ''}
              >
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  // Agrupador sin página propia: se muestra deshabilitado, no como enlace ni
                  // como página actual (esa siempre es el último nivel).
                  <span aria-disabled="true" className="truncate opacity-70">
                    {crumb.label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
