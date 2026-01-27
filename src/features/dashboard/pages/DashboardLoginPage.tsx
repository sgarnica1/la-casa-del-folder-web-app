import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { Loading } from '@/components/ui';
import { useApiClient } from '@/hooks/useApiClient';
import { apiClient } from '@/services/api-client';
import { UserRole } from '@/types';

const MAX_TOKEN_RETRIES = 10;
const TOKEN_RETRY_DELAY_MS = 200;

export function DashboardLoginPage() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  useApiClient(); // Initialize API client for token handling

  // Wait for token to be available
  const waitForToken = useCallback(async (): Promise<string | null> => {
    console.log('[DashboardLoginPage] waitForToken called', { isLoaded, isSignedIn });

    if (!isLoaded || !isSignedIn) {
      console.log('[DashboardLoginPage] Cannot wait for token - not loaded or not signed in');
      return null;
    }

    for (let i = 0; i < MAX_TOKEN_RETRIES; i++) {
      try {
        console.log(`[DashboardLoginPage] Attempting to get token (attempt ${i + 1}/${MAX_TOKEN_RETRIES})`);
        const token = await getToken();
        if (token) {
          console.log('[DashboardLoginPage] Token obtained successfully on attempt', i + 1);
          return token;
        }
        console.log(`[DashboardLoginPage] Token was null on attempt ${i + 1}`);
      } catch (error) {
        console.warn(`[DashboardLoginPage] Token retry ${i + 1}/${MAX_TOKEN_RETRIES}:`, error);
      }

      if (i < MAX_TOKEN_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, TOKEN_RETRY_DELAY_MS));
      }
    }

    console.error('[DashboardLoginPage] Failed to get token after all retries');
    return null;
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    console.log('[DashboardLoginPage] useEffect triggered', { isLoaded, isSignedIn, isChecking });

    if (!isLoaded) {
      console.log('[DashboardLoginPage] Clerk not loaded yet');
      return;
    }

    // If not signed in, show login form
    if (!isSignedIn) {
      console.log('[DashboardLoginPage] User not signed in, showing login form');
      setIsChecking(false);
      return;
    }

    console.log('[DashboardLoginPage] User is signed in, checking role...');

    // If signed in, check role and redirect accordingly
    const checkRoleAndRedirect = async () => {
      console.log('[DashboardLoginPage] Starting role check...');
      const token = await waitForToken();
      console.log('[DashboardLoginPage] Token obtained:', !!token);

      if (!token) {
        console.warn('[DashboardLoginPage] No token available after waiting');
        setIsChecking(false);
        return;
      }

      try {
        console.log('[DashboardLoginPage] Fetching current user...');
        const user = await apiClient.user.getCurrentUser();
        console.log('[DashboardLoginPage] User fetched:', { id: user.id, role: user.role, clerkUserId: user.clerkUserId });
        console.log('[DashboardLoginPage] Comparing role:', { userRole: user.role, adminRole: UserRole.ADMIN, match: user.role === UserRole.ADMIN });

        // Compare as strings to ensure we catch the enum value correctly
        const userRoleValue = user.role as string;
        const isAdmin = userRoleValue === UserRole.ADMIN || userRoleValue === 'admin';

        console.log('[DashboardLoginPage] Role check result:', { userRoleValue, isAdmin });

        if (isAdmin) {
          console.log('[DashboardLoginPage] User is admin, redirecting to /dashboard/orders');
          navigate('/dashboard/orders', { replace: true });
        } else {
          console.log('[DashboardLoginPage] User is not admin (role:', userRoleValue, '), redirecting to /product/calendar');
          // If not admin, redirect to home page
          navigate('/product/calendar', { replace: true });
        }
      } catch (err) {
        console.error('[DashboardLoginPage] Error checking user role:', err);
        console.error('[DashboardLoginPage] Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
        });
        // On error, redirect to home
        navigate('/product/calendar', { replace: true });
      }
    };

    checkRoleAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, navigate, waitForToken]);

  // Show loading while checking auth state or while checking role
  if (!isLoaded || isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // If signed in, we should have already redirected (checking role or redirecting)
  // If we're still here and signed in, show loading while redirect happens
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // Show login form only when not signed in
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión para acceder al panel de administración
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                footer: 'hidden', // Hide footer that might contain sign-up link
              },
            }}
            routing="path"
            path="/dashboard"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
