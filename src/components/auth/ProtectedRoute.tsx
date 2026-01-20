import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Loading } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { UserRole, type UserRoleType } from '@/types';

const MAX_TOKEN_RETRIES = 10;
const TOKEN_RETRY_DELAY_MS = 200;

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRoleType;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  // Wait for token to be available before making API calls
  const waitForToken = useCallback(async (): Promise<string | null> => {
    if (!isLoaded || !isSignedIn) {
      return null;
    }

    for (let i = 0; i < MAX_TOKEN_RETRIES; i++) {
      try {
        const token = await getToken();
        if (token) {
          console.log('[ProtectedRoute] Token obtained after', i + 1, 'attempt(s)');
          return token;
        }
      } catch (error) {
        console.warn(`[ProtectedRoute] Token retry ${i + 1}/${MAX_TOKEN_RETRIES}:`, error);
      }

      if (i < MAX_TOKEN_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, TOKEN_RETRY_DELAY_MS));
      }
    }

    console.error('[ProtectedRoute] Failed to get token after', MAX_TOKEN_RETRIES, 'attempts');
    return null;
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    console.log('[ProtectedRoute] Effect running', { isLoaded, isSignedIn, requiredRole });
    if (isLoaded && isSignedIn && requiredRole) {
      setIsLoadingRole(true);
      console.log('[ProtectedRoute] Waiting for token before fetching user role...');

      waitForToken()
        .then((token) => {
          if (!token) {
            console.error('[ProtectedRoute] No token available, defaulting to customer role');
            setUserRole(UserRole.CUSTOMER);
            return;
          }

          console.log('[ProtectedRoute] Token available, fetching user role...');
          return apiClient.getCurrentUser();
        })
        .then((user) => {
          if (user) {
            console.log('[ProtectedRoute] User role fetched:', user.role);
            setUserRole(user.role as UserRoleType);
          }
        })
        .catch((err) => {
          console.error('[ProtectedRoute] Error fetching user role:', err);
          setUserRole(UserRole.CUSTOMER);
        })
        .finally(() => {
          setIsLoadingRole(false);
        });
    } else if (!requiredRole) {
      console.log('[ProtectedRoute] No role required, allowing access');
      setUserRole(null);
    }
  }, [isLoaded, isSignedIn, requiredRole, waitForToken]);

  console.log('[ProtectedRoute] Render', {
    isLoaded,
    isSignedIn,
    requiredRole,
    userRole,
    isLoadingRole
  });

  if (!isLoaded || (requiredRole && isLoadingRole)) {
    console.log('[ProtectedRoute] Showing loading...');
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    console.log('[ProtectedRoute] Not signed in, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    // Don't render children until role is verified
    if (userRole === null) {
      console.log('[ProtectedRoute] Role is null, showing loading...');
      return (
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      );
    }

    // Admins can access customer routes, but customers cannot access admin routes
    const hasAccess = requiredRole === UserRole.CUSTOMER
      ? userRole === UserRole.CUSTOMER || userRole === UserRole.ADMIN  // Admins can access customer routes
      : userRole === requiredRole;  // Admin routes only for admins

    if (!hasAccess) {
      console.log('[ProtectedRoute] Access denied', { userRole, requiredRole }, 'redirecting to /');
      return <Navigate to="/" replace />;
    }
  }

  // Only render children after all checks pass
  console.log('[ProtectedRoute] Allowing access to children');
  return <>{children}</>;
}
