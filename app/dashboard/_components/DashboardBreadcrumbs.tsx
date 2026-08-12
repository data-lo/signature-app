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
import {
  DOCUMENTS_GROUP_LABEL,
  DOCUMENTS_LEGACY_ROUTES,
  DOCUMENTS_NAV_SECTIONS,
} from '../documents/_config/sections';

interface Crumb {
  label: string;
  /** Sin `href` el nivel no es interactivo: o es un agrupador (p. ej. "Documentos", que no
   * tiene página propia) o es la página actual, que siempre va al final. */
  href?: string;
}

/** "Documentos" es solo un agrupador visual: se muestra sin enlace en todo el módulo. */
const DOCUMENTS_GROUP_CRUMB: Crumb = { label: DOCUMENTS_GROUP_LABEL };

/** Breadcrumbs del módulo de documentos, derivados de la misma configuración que alimenta el
 * sidebar para que el nombre de la sección coincida exactamente en ambos componentes. */
const DOCUMENTS_CRUMBS: Record<string, Crumb[]> = Object.fromEntries(
  DOCUMENTS_NAV_SECTIONS.map((section) => [
    section.href,
    [DOCUMENTS_GROUP_CRUMB, { label: section.label }],
  ]),
);

/** Mapa estático ruta -> jerarquía de breadcrumbs, alineado con las etiquetas usadas en
 * AppSidebar y en las tabs de configuración de organización para mantener nombres consistentes. */
const STATIC_CRUMBS: Record<string, Crumb[]> = {
  ...DOCUMENTS_CRUMBS,
  '/dashboard/organization/create': [{ label: 'Crear organización' }],
  '/dashboard/organization/settings/members': [
    {
      label: 'Organización',
      href: '/dashboard/organization/settings/members',
    },
    { label: 'Administrar miembros' },
  ],
  '/dashboard/organization/settings/permissions': [
    {
      label: 'Organización',
      href: '/dashboard/organization/settings/members',
    },
    { label: 'Permisos' },
  ],
  '/dashboard/personal-documents': [{ label: 'Información personal' }],
  '/dashboard/personal-documents/identity': [
    {
      label: 'Información personal',
      href: '/dashboard/personal-documents',
    },
    { label: 'Identidad y firma' },
  ],
  '/dashboard/plans': [{ label: 'Suscripciones' }],
  '/dashboard/plans/cancel': [
    { label: 'Suscripciones', href: '/dashboard/plans' },
    { label: 'Cancelación' },
  ],
  '/dashboard/plans/success': [
    { label: 'Suscripciones', href: '/dashboard/plans' },
    { label: 'Confirmación' },
  ],
};

const DOCUMENT_DETAIL_PATTERN = /^\/dashboard\/documents\/([^/]+)$/;

function useCrumbs(pathname: string): Crumb[] {
  // Las rutas anteriores del módulo solo redirigen (ver sus page.tsx): mientras la redirección
  // ocurre se muestran los breadcrumbs de su ruta nueva, en vez de nada o de un id inexistente.
  const resolvedPathname = DOCUMENTS_LEGACY_ROUTES[pathname] ?? pathname;
  const staticCrumbs = STATIC_CRUMBS[resolvedPathname];
  // Solo se interpreta como un id de documento si la ruta no coincide con ninguna ruta estática
  // conocida (bug corregido: "/dashboard/documents/create" y las demás secciones también
  // matchean DOCUMENT_DETAIL_PATTERN por ser un solo segmento, lo que disparaba un
  // GET /document/create|to-sign|... inexistente y rompía sus propios breadcrumbs estáticos).
  const documentId = staticCrumbs
    ? undefined
    : resolvedPathname.match(DOCUMENT_DETAIL_PATTERN)?.[1];
  const { data: document } = useDocumentDetail(documentId ?? '', {
    enabled: !!documentId,
  });

  if (documentId) {
    return [
      DOCUMENTS_GROUP_CRUMB,
      { label: document?.fileName ?? 'Detalle del documento' },
    ];
  }

  return staticCrumbs ?? [];
}

export default function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = useCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="flex h-10 items-center border-b border-border px-4">
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
