'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../auth';
import { useAuthStore } from '@/lib/store/useAuthStore';

/**
 * Cierra la sesión: avisa al backend, limpia el store y vuelve al login.
 *
 * Además descarta del caché de React Query las URLs prefirmadas de MinIO
 * (`['documentFileUrl', …]`). La salida navega con el router, sin recargar la página, así que el
 * caché en memoria sobrevive al logout: sin esto, las URLs —vigentes hasta 24 h y utilizables
 * por cualquiera que las tenga— seguirían en la pestaña durante la sesión del siguiente usuario.
 *
 * @returns La mutación de React Query; `mutate()` dispara el cierre de sesión.
 *
 * @example
 * ```ts
 * const logoutMutation = useLogout();
 * logoutMutation.mutate();
 * ```
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().logout();
      queryClient.removeQueries({ queryKey: ['documentFileUrl'] });
      router.push('/login');
    },
  });
}
