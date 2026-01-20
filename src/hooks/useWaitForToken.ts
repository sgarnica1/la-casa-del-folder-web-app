import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const MAX_TOKEN_RETRIES = 10;
const TOKEN_RETRY_DELAY_MS = 200;

export function useWaitForToken() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const waitForToken = useCallback(async (): Promise<string | null> => {
    if (!isLoaded || !isSignedIn) {
      return null;
    }

    for (let i = 0; i < MAX_TOKEN_RETRIES; i++) {
      try {
        const token = await getToken();
        if (token) {
          return token;
        }
      } catch (error) {
        console.warn(`[useWaitForToken] Token retry ${i + 1}/${MAX_TOKEN_RETRIES}:`, error);
      }

      if (i < MAX_TOKEN_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, TOKEN_RETRY_DELAY_MS));
      }
    }

    console.error('[useWaitForToken] Failed to get token after', MAX_TOKEN_RETRIES, 'attempts');
    return null;
  }, [isLoaded, isSignedIn, getToken]);

  return { waitForToken, isLoaded, isSignedIn };
}
