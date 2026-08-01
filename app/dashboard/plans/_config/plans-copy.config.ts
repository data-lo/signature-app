import { PlanId } from '@/lib/api/plans/plan.interface';

export interface PlanCopy {
  title: string;
  description: string;
  features: string[];
}

/**
 * Copia visual de cada plan. Único archivo que debe cambiar al lanzar los
 * planes comerciales finales — el id debe seguir coincidiendo con el que
 * devuelve el backend (GET /stripe/plans).
 */
export const PLANS_COPY: Record<PlanId, PlanCopy> = {
  basic: {
    title: 'Básico',
    description: 'Para firmar documentos de forma ocasional.',
    features: ['Firma de documentos ilimitada', 'Soporte por correo'],
  },
  pro: {
    title: 'Pro',
    description: 'Para equipos que firman documentos con regularidad.',
    features: ['Todo lo del plan Básico', 'Múltiples firmantes por documento', 'Soporte prioritario'],
  },
  enterprise: {
    title: 'Empresarial',
    description: 'Para organizaciones con necesidades avanzadas de firma.',
    features: ['Todo lo del plan Pro', 'Auditoría avanzada', 'Soporte dedicado'],
  },
};
