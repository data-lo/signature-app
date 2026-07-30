import { redirect } from 'next/navigation';

/** Vista por defecto del dashboard: /dashboard consolida en /dashboard/documents/create. */
export default function DashboardPage() {
  redirect('/dashboard/documents/create');
}
