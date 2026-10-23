'use client';

import apiClient from './axios';
import { clearAuthToken } from './cookies';

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/logout');
  } finally {
    clearAuthToken();
  }
}
