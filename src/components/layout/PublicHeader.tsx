import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui';

export function PublicHeader() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/product/calendar" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              La Casa Del Folder
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/product/calendar"
                className={`text-sm font-medium transition-colors ${isActive('/product/calendar')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Inicio
              </Link>
              <Link
                to="/products"
                className={`text-sm font-medium transition-colors ${isActive('/products')
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Productos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" size="sm">
                  Iniciar Sesión
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/product/calendar" />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
