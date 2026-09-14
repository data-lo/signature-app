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
import DocumentsAvailability from './DocumentsAvailability';

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
  // "Organización" quedó sin página propia al mudarse Administrar miembros a su ruta con
  // `organizationId`: ya no hay una URL fija a la que llevar, así que es un agrupador sin enlace.
  '/dashboard/organization/settings/permissions': [
    { label: 'Organización' },
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
    return [{ label: 'Organización' }, { label: 'Administrar miembros' }];
  }

  return staticCrumbs ?? [];
}

/**
 * Barra superior del dashboard: breadcrumbs a la izquierda, saldo de documentos y el acceso para
 * comprar más a la derecha.
 *
 * Los breadcrumbs no cambian —las mismas rutas, los mismos enlaces y el mismo último nivel no
 * interactivo—; lo único nuevo es que ahora comparten la fila con `DocumentsAvailability`, que
 * resuelve su propio dato y no recibe nada de acá.
 *
 * Sigue sin dibujarse nada cuando la ruta no tiene breadcrumbs configurados, y con ella se va
 * también el saldo. No es un descuido: toda ruta real del dashboard tiene su jerarquía en
 * `STATIC_CRUMBS` o resuelta por patrón, así que el caso vacío es una ruta que no existe.
 *
 * @returns La barra, o `null` en una ruta sin breadcrumbs configurados.
 * @throws Nada.
 *
 * @example
 * ```tsx
 * <DashboardBreadcrumbs />
 * ```
 */
export default function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = useCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    /* La fila se envuelve en móvil en vez de recortarse: con `flex-wrap` el saldo y el botón
       bajan a una segunda línea y nada desborda. En pantallas `sm` y mayores se fuerza una sola
       línea (`sm:flex-nowrap`) y quien cede espacio es el breadcrumb, que ya trunca su último
       nivel. */
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-1.5 sm:flex-nowrap sm:py-0">
      <Breadcrumb className="flex items-center">
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

      <DocumentsAvailability />
    </div>
  );
}
