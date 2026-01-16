import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '@/services/api-client';

export function useApiClient() {
  const { getToken } = useAuth();

  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return apiClient;
}
