import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '@/services/api-client';

export function useApiClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      if (!isLoaded) {
        return null;
      }

      if (!isSignedIn) {
        return null;
      }

      try {
        const token = await getToken();
        return token;
      } catch (error) {
        console.error('[useApiClient] Error getting token:', error);
        return null;
      }
    });
  }, [getToken, isLoaded, isSignedIn]);

  return apiClient;
}
