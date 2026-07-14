import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

async function patchUserStatusRequest(): Promise<void> {
  await apiClient.patch('/user/me/status', { isConfigured: true });
}

export function usePatchUserStatus() {
  return useMutation({
    mutationFn: patchUserStatusRequest,
  });
}
