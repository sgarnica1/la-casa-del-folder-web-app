import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '@/services/api-client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'customer';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [userRole, setUserRole] = useState<'admin' | 'customer' | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && requiredRole) {
      setIsLoadingRole(true);
      apiClient.getCurrentUser()
        .then((user) => {
          setUserRole(user.role);
        })
        .catch(() => {
          setUserRole('customer');
        })
        .finally(() => {
          setIsLoadingRole(false);
        });
    }
  }, [isLoaded, isSignedIn, requiredRole]);

  if (!isLoaded || (requiredRole && isLoadingRole)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    if (userRole === null) {
      return (
        <div className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </div>
      );
    }

    if (userRole !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
