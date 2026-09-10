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
  '/dashboard/plans': [{ label: 'Planes' }],
  '/dashboard/subscriptions': [{ label: 'Suscripciones' }],
};

const DOCUMENT_DETAIL_PATTERN = /^\/dashboard\/documents\/([^/]+)$/;

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
