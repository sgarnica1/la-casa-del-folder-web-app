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
          return token;
        }
      } catch (error) {
        console.warn(`[ProtectedRoute] Token retry ${i + 1}/${MAX_TOKEN_RETRIES}:`, error);
      }

      if (i < MAX_TOKEN_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, TOKEN_RETRY_DELAY_MS));
      }
    }
    return null;
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn && requiredRole) {
      setIsLoadingRole(true);

      waitForToken()
        .then((token) => {
          if (!token) {
            setUserRole(UserRole.CUSTOMER);
            return;
          }

          return apiClient.user.getCurrentUser();
        })
        .then((user) => {
          if (user) {
            setUserRole(user.role as UserRoleType);
          }
        })
        .catch((err) => {
          console.warn('[ProtectedRoute] Error fetching user role, defaulting to customer:', err);
          setUserRole(UserRole.CUSTOMER);
        })
        .finally(() => {
          setIsLoadingRole(false);
        });
    } else if (!requiredRole) {
      setUserRole(null);
    }
  }, [isLoaded, isSignedIn, requiredRole, waitForToken]);

  if (!isLoaded || (requiredRole && isLoadingRole)) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    // Don't render children until role is verified
    if (userRole === null) {
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
      return <Navigate to="/" replace />;
    }
  }

  // Only render children after all checks pass
  return <>{children}</>;
}
