import { redirect } from 'next/navigation';
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/lib/auth-redirect';

/** Vista por defecto del dashboard: /dashboard consolida en el dashboard de documentos. */
export default function DashboardPage() {
  redirect(DEFAULT_AUTHENTICATED_ROUTE);
}
