import {
  Clock,
  FileCheck,
  FilePlus,
  Folder,
  type LucideIcon,
} from 'lucide-react';
import { ParticipantStatus } from '@/lib/enums/document';

/**
 * Fuente única de verdad del módulo de documentos: nombre, ruta e icono de cada sección.
 * AppSidebar y DashboardBreadcrumbs consumen exactamente estas constantes, así que el nombre
 * mostrado en el sidebar y el del breadcrumb nunca pueden divergir.
 */

/** Agrupador visual del módulo: no tiene página propia, por eso no lleva `href`. */
export const DOCUMENTS_GROUP_LABEL = 'Documentos';

export const DOCUMENTS_BASE_PATH = '/dashboard/documents';

/** Secciones que renderizan un listado a través de `DocumentsView`. */
export type DocumentsListType = 'to-sign' | 'sent' | 'completed';

/** Todas las secciones del módulo, incluida la de creación (que tiene su propia vista). */
export type DocumentsSectionKey = 'create' | DocumentsListType;

export interface DocumentsSection {
  key: DocumentsSectionKey;
  /** Nombre mostrado en el sidebar y como segundo nivel del breadcrumb. */
  label: string;
  href: string;
  icon: LucideIcon;
}

export const DOCUMENTS_SECTIONS: Record<DocumentsSectionKey, DocumentsSection> =
  {
    create: {
      key: 'create',
      label: 'Nuevo documento',
      href: `${DOCUMENTS_BASE_PATH}/create`,
      icon: FilePlus,
    },
    'to-sign': {
      key: 'to-sign',
      label: 'Por firmar',
      href: `${DOCUMENTS_BASE_PATH}/to-sign`,
      icon: Clock,
    },
    sent: {
      key: 'sent',
      label: 'Enviados para firma',
      href: `${DOCUMENTS_BASE_PATH}/sent`,
      icon: Folder,
    },
    completed: {
      key: 'completed',
      label: 'Completados',
      href: `${DOCUMENTS_BASE_PATH}/completed`,
      icon: FileCheck,
    },
  };

/** Orden en el que se listan las secciones en el sidebar. */
export const DOCUMENTS_NAV_SECTIONS: DocumentsSection[] = [
  DOCUMENTS_SECTIONS.create,
  DOCUMENTS_SECTIONS['to-sign'],
  DOCUMENTS_SECTIONS.sent,
  DOCUMENTS_SECTIONS.completed,
];

export const DOCUMENTS_SECTION_BY_PATH: Record<string, DocumentsSection> =
  Object.fromEntries(
    DOCUMENTS_NAV_SECTIONS.map((section) => [section.href, section]),
  );

/**
 * Rutas anteriores del módulo, conservadas solo para no romper links/bookmarks guardados:
 * su `page.tsx` únicamente redirige a la ruta nueva equivalente.
 * `/dashboard/documents` además distinguía "Por firmar"/"Completados" por `?status=`.
 */
export const DOCUMENTS_LEGACY_ROUTES: Record<string, string> = {
  [DOCUMENTS_BASE_PATH]: DOCUMENTS_SECTIONS['to-sign'].href,
  [`${DOCUMENTS_BASE_PATH}/created`]: DOCUMENTS_SECTIONS.sent.href,
};

export interface DocumentsListConfig {
  /** 'participant': documentos donde el usuario colabora. 'creator': documentos que envió. */
  scope: 'participant' | 'creator';
  status?: ParticipantStatus.Pending | ParticipantStatus.Signed;
  limit: number;
  /** La acción "FIRMAR" solo aplica donde el usuario todavía tiene que firmar. */
  canSign: boolean;
  showMyTurnFilter: boolean;
  showStatusFilter: boolean;
}

/** Diferencias de consulta y de tabla entre secciones; el resto de la vista es idéntico. */
export const DOCUMENTS_LIST_CONFIG: Record<
  DocumentsListType,
  DocumentsListConfig
> = {
  'to-sign': {
    scope: 'participant',
    status: ParticipantStatus.Pending,
    limit: 25,
    canSign: true,
    showMyTurnFilter: true,
    showStatusFilter: false,
  },
  sent: {
    scope: 'creator',
    limit: 10,
    canSign: false,
    showMyTurnFilter: false,
    showStatusFilter: true,
  },
  completed: {
    scope: 'participant',
    status: ParticipantStatus.Signed,
    limit: 25,
    canSign: false,
    showMyTurnFilter: true,
    showStatusFilter: false,
  },
};
