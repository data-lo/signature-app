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

interface Crumb {
  label: string;
  href?: string;
}

/** Mapa estático ruta -> jerarquía de breadcrumbs, alineado con las etiquetas usadas en
 * AppSidebar y en las tabs de configuración de organización para mantener nombres consistentes. */
const STATIC_CRUMBS: Record<string, Crumb[]> = {
  '/dashboard/documents': [{ label: 'Documentos' }],
  '/dashboard/documents/create': [
    { label: 'Documentos', href: '/dashboard/documents' },
    { label: 'Nuevo documento' },
  ],
  '/dashboard/documents/created': [
    { label: 'Documentos', href: '/dashboard/documents' },
    { label: 'Enviados para firma' },
  ],
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
  const staticCrumbs = STATIC_CRUMBS[pathname];
  // Solo se interpreta como un id de documento si la ruta no coincide con ninguna ruta estática
  // conocida (bug corregido: "/dashboard/documents/create" y ".../created" también matchean
  // DOCUMENT_DETAIL_PATTERN por ser un solo segmento, lo que disparaba un
  // GET /document/create|created inexistente y rompía sus propios breadcrumbs estáticos).
  const documentId = staticCrumbs
    ? undefined
    : pathname.match(DOCUMENT_DETAIL_PATTERN)?.[1];
  const { data: document } = useDocumentDetail(documentId ?? '', {
    enabled: !!documentId,
  });

  if (documentId) {
    return [
      { label: 'Documentos', href: '/dashboard/documents' },
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
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
