import { memo } from 'react';
import type { DocumentAction } from '../_hooks/useDocumentLifecycle';

export interface BannerConfig {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  subtitleColor: string;
  title: string;
  subtitle: string;
  navTitle: string;
  iconType: 'check' | 'x';
}

export const COMPLETED_BANNERS: Record<DocumentAction, BannerConfig> = {
  sign: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    subtitleColor: 'text-green-600',
    title: 'Documento firmado exitosamente',
    subtitle: 'La firma ha sido estampada en el documento.',
    navTitle: 'Documento Firmado',
    iconType: 'check',
  },
  reject: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-800',
    subtitleColor: 'text-orange-600',
    title: 'Documento rechazado',
    subtitle: 'El documento ha sido rechazado exitosamente.',
    navTitle: 'Documento Rechazado',
    iconType: 'x',
  },
  cancel: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-600',
    title: 'Documento cancelado',
    subtitle: 'El documento firmado ha sido cancelado exitosamente.',
    navTitle: 'Documento Cancelado',
    iconType: 'x',
  },
};

export const STATUS_BANNERS: Record<string, BannerConfig> = {
  rejected: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleColor: 'text-orange-800',
    subtitleColor: 'text-orange-600',
    title: 'Este documento fue rechazado',
    subtitle: 'No es posible realizar acciones sobre este documento.',
    navTitle: 'Documento Rechazado',
    iconType: 'x',
  },
  cancelled: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-600',
    title: 'Este documento fue cancelado',
    subtitle: 'No es posible realizar acciones sobre este documento.',
    navTitle: 'Documento Cancelado',
    iconType: 'x',
  },
};

function StatusBanner({ config }: { config: BannerConfig }) {
  return (
    <div className={`${config.bg} border-b ${config.border} px-6 py-3 flex items-center gap-3 flex-shrink-0`}>
      <div className={`w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        {config.iconType === 'check' ? (
          <svg className={`w-5 h-5 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div>
        <p className={`font-semibold ${config.titleColor}`}>{config.title}</p>
        <p className={`text-sm ${config.subtitleColor}`}>{config.subtitle}</p>
      </div>
    </div>
  );
}

export default memo(StatusBanner);
